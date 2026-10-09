type ZohoApiResponse<T> = {
  code?: number;
  message?: string;
} & T;

type ZohoLocation = {
  location_id?: string | number;
  is_active?: boolean;
};

type ZohoItemLocation = {
  location_id?: string | number;
  location_available_stock?: number | string;
};

type ZohoItem = {
  item_id?: string | number;
  sku?: string;
  locations?: ZohoItemLocation[];
};

type ZohoCredentials = {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  organizationId: string;
  locationIds: string[];
  accountsUrl: string;
  apiUrl: string;
};

export type ZohoStockUpdate = {
  sku: string;
  stock: number;
};

export class ZohoInventoryError extends Error {}

const normalizeSku = (sku: string) => sku.trim().toUpperCase();
const normalizeUrl = (value: string) => value.replace(/\/+$/, "");
const isZohoAccountsHost = (hostname: string) => /^accounts\.zoho\.(com|eu|in|com\.au|jp|ca|sa|com\.cn)$/i.test(hostname);
const isZohoApiHost = (hostname: string) => /^(www\.)?zohoapis\.(com|eu|in|com\.au|jp|ca|sa|com\.cn)$/i.test(hostname);

const getCredentials = (): ZohoCredentials => {
  const clientId = process.env.ZOHO_CLIENT_ID?.trim();
  const clientSecret = process.env.ZOHO_CLIENT_SECRET?.trim();
  const refreshToken = process.env.ZOHO_REFRESH_TOKEN?.trim();
  const organizationId = process.env.ZOHO_ORGANIZATION_ID?.trim();
  const locationIds = process.env.ZOHO_LOCATION_IDS?.split(",").map((id) => id.trim()).filter(Boolean) ?? [];
  const accountsUrl = normalizeUrl(process.env.ZOHO_ACCOUNTS_URL?.trim() || "https://accounts.zoho.com");
  const apiUrl = normalizeUrl(process.env.ZOHO_API_URL?.trim() || "https://www.zohoapis.com");

  if (!clientId || !clientSecret || !refreshToken || !organizationId || locationIds.length === 0) {
    throw new ZohoInventoryError("Zoho inventory configuration is incomplete.");
  }

  if (new Set(locationIds).size !== locationIds.length) {
    throw new ZohoInventoryError("ZOHO_LOCATION_IDS contains duplicate location IDs.");
  }

  for (const [value, isValidHost] of [[accountsUrl, isZohoAccountsHost], [apiUrl, isZohoApiHost]] as const) {
    const url = new URL(value);
    if (
      url.protocol !== "https:"
      || url.pathname !== "/"
      || url.search
      || url.hash
      || url.username
      || url.password
      || !isValidHost(url.hostname)
    ) {
      throw new ZohoInventoryError("Zoho account and API URLs must use a supported HTTPS Zoho domain.");
    }
  }

  return { clientId, clientSecret, refreshToken, organizationId, locationIds, accountsUrl, apiUrl };
};

const getAccessToken = async (credentials: ZohoCredentials) => {
  const tokenUrl = new URL("/oauth/v2/token", credentials.accountsUrl);
  const body = new URLSearchParams({
    client_id: credentials.clientId,
    client_secret: credentials.clientSecret,
    refresh_token: credentials.refreshToken,
    grant_type: "refresh_token",
  });

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  const result = await response.json() as {
    access_token?: string;
    api_domain?: string;
    error?: string;
  };

  if (!response.ok || !result.access_token) {
    throw new ZohoInventoryError(`Zoho OAuth failed${result.error ? ` (${result.error})` : ""}.`);
  }

  const apiUrl = normalizeUrl(result.api_domain || credentials.apiUrl);
  const parsedApiUrl = new URL(apiUrl);
  if (
    parsedApiUrl.protocol !== "https:"
    || parsedApiUrl.pathname !== "/"
    || parsedApiUrl.search
    || parsedApiUrl.hash
    || !isZohoApiHost(parsedApiUrl.hostname)
  ) {
    throw new ZohoInventoryError("Zoho returned an invalid API domain.");
  }

  return { accessToken: result.access_token, apiUrl };
};

const zohoGet = async <T>(
  apiUrl: string,
  accessToken: string,
  path: string,
  parameters: Record<string, string>,
): Promise<T> => {
  const url = new URL(path, `${apiUrl}/`);
  Object.entries(parameters).forEach(([key, value]) => url.searchParams.set(key, value));
  const response = await fetch(url, {
    headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
    cache: "no-store",
  });
  const result = await response.json() as ZohoApiResponse<T>;

  if (!response.ok || result.code !== 0) {
    throw new ZohoInventoryError(`Zoho inventory API request failed${result.message ? ` (${result.message})` : ""}.`);
  }

  return result;
};

const getLocations = async (credentials: ZohoCredentials, apiUrl: string, accessToken: string) => {
  const result = await zohoGet<{ locations?: ZohoLocation[] }>(apiUrl, accessToken, "locations", {
    organization_id: credentials.organizationId,
  });
  const availableIds = new Set((result.locations ?? []).map((location) => String(location.location_id ?? "")));
  const missingIds = credentials.locationIds.filter((id) => !availableIds.has(id));

  if (missingIds.length > 0) {
    throw new ZohoInventoryError(`Configured Zoho location IDs were not found: ${missingIds.join(", ")}.`);
  }
};

const getItems = async (credentials: ZohoCredentials, apiUrl: string, accessToken: string) => {
  const items: ZohoItem[] = [];
  let page = 1;

  while (page <= 100) {
    const result = await zohoGet<{
      items?: ZohoItem[];
      page_context?: { has_more_page?: boolean };
    }>(apiUrl, accessToken, "items", {
      organization_id: credentials.organizationId,
      page: String(page),
      per_page: "200",
    });
    const pageItems = result.items;
    if (!Array.isArray(pageItems)) {
      throw new ZohoInventoryError("Zoho returned an invalid item list.");
    }
    items.push(...pageItems);
    if (result.page_context?.has_more_page === true) {
      page += 1;
      continue;
    }
    if (result.page_context?.has_more_page === false || pageItems.length < 200) return items;
    throw new ZohoInventoryError("Zoho returned an incomplete item page without pagination details.");
  }

  throw new ZohoInventoryError("Zoho item pagination exceeded the safety limit.");
};

const getItemDetails = async (
  credentials: ZohoCredentials,
  apiUrl: string,
  accessToken: string,
  items: ZohoItem[],
) => {
  const detailedItems: ZohoItem[] = [];

  for (let index = 0; index < items.length; index += 5) {
    const batch = items.slice(index, index + 5);
    const details = await Promise.all(batch.map(async (item) => {
      if (item.item_id === undefined || item.item_id === null) {
        throw new ZohoInventoryError(`Zoho did not return an item ID for SKU ${item.sku ?? "(unknown)"}.`);
      }

      const result = await zohoGet<{ item?: ZohoItem }>(
        apiUrl,
        accessToken,
        `items/${encodeURIComponent(String(item.item_id))}`,
        { organization_id: credentials.organizationId },
      );
      if (!result.item || normalizeSku(result.item.sku ?? "") !== normalizeSku(item.sku ?? "")) {
        throw new ZohoInventoryError(`Zoho item details did not match SKU ${item.sku ?? "(unknown)"}.`);
      }
      return result.item;
    }));
    detailedItems.push(...details);
  }

  return detailedItems;
};

export const getZohoStockUpdates = async (websiteSkus: string[]): Promise<ZohoStockUpdate[]> => {
  const credentials = getCredentials();
  const { accessToken, apiUrl } = await getAccessToken(credentials);
  await getLocations(credentials, apiUrl, accessToken);
  const items = await getItems(credentials, apiUrl, accessToken);
  const wantedSkus = new Set(websiteSkus.map(normalizeSku));
  const matchingItems = new Map<string, ZohoItem>();

  for (const item of items) {
    if (typeof item.sku !== "string") continue;
    const sku = normalizeSku(item.sku);
    if (!wantedSkus.has(sku)) continue;
    if (matchingItems.has(sku)) {
      throw new ZohoInventoryError(`Zoho contains more than one item with SKU ${sku}.`);
    }
    matchingItems.set(sku, item);
  }

  const itemsNeedingDetails = Array.from(matchingItems.values()).filter((item) => !Array.isArray(item.locations));
  const detailedItems = await getItemDetails(credentials, apiUrl, accessToken, itemsNeedingDetails);
  detailedItems.forEach((item) => {
    const sku = normalizeSku(item.sku ?? "");
    matchingItems.set(sku, item);
  });

  const updates = new Map<string, number>();
  for (const [sku, item] of matchingItems) {
    if (!Array.isArray(item.locations)) {
      throw new ZohoInventoryError(`Zoho did not return warehouse stock details for SKU ${sku}. No stock was changed.`);
    }
    const selectedLocations = new Set(credentials.locationIds);
    let availableStock = 0;
    const seenLocationIds = new Set<string>();
    for (const location of item.locations) {
      const locationId = String(location.location_id ?? "");
      if (!selectedLocations.has(locationId)) continue;
      if (seenLocationIds.has(locationId)) {
        throw new ZohoInventoryError(`Zoho returned duplicate warehouse stock for SKU ${sku}.`);
      }
      seenLocationIds.add(locationId);

      const quantityValue = location.location_available_stock;
      if (
        (typeof quantityValue !== "number" && typeof quantityValue !== "string")
        || (typeof quantityValue === "string" && quantityValue.trim() === "")
        || !Number.isFinite(Number(quantityValue))
      ) {
        throw new ZohoInventoryError(`Zoho returned an invalid available-stock quantity for SKU ${sku}. No stock was changed.`);
      }
      const quantity = Number(quantityValue);
      availableStock += quantity;
    }

    updates.set(sku, Math.max(0, Math.floor(availableStock)));
  }

  return Array.from(updates, ([sku, stock]) => ({ sku, stock }));
};

export const normalizeZohoSku = normalizeSku;
