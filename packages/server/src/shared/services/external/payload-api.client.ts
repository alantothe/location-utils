import { EnvConfig } from "../../config/env.config";
import { ServiceUnavailableError } from "../../core/errors/http-error";

export interface PayloadAuthResponse {
  message: string;
  user: {
    id: string;
    email: string;
    role: string;
  };
  token: string;
  exp: number;
}

export interface PayloadMediaAssetResponse {
  message: string;
  doc: {
    id: string;
    filename: string;
    mimeType: string;
    filesize: number;
    width: number;
    height: number;
    url: string;
    altText?: string;
    location?: string;
    createdAt: string;
    updatedAt: string;
  };
}

export interface PayloadEntryResponse {
  message: string;
  doc: {
    id: string;
    title: string;
    type?: string;
    locationRef?: string;
    gallery: Array<{
      image: {
        id: string;
        filename: string;
        url: string;
      };
      altText?: string;
      caption?: string;
      id: string;
    }>;
    status: "draft" | "published";
    createdAt: string;
    updatedAt: string;
  };
}

export interface PayloadLocationQueryResponse {
  docs: Array<{
    id: string;
    locationKey?: string;
  }>;
  totalDocs?: number;
}

export type PayloadLocationCreateData =
  | {
      level: "country";
      country: string;
      countryName: string;
    }
  | {
      level: "city";
      country: string;
      city: string;
      countryName: string;
      cityName: string;
    }
  | {
      level: "neighborhood";
      country: string;
      city: string;
      neighborhood: string;
      countryName: string;
      cityName: string;
      neighborhoodName: string;
    };

export interface PayloadLocationCreateResponse {
  message: string;
  doc: {
    id: string;
    level: string;
    locationKey?: string;
  };
}

export interface PayloadGalleryItem {
  image: string; // MediaAsset ID
  altText?: string;
  caption?: string;
}

export interface PayloadInstagramPostData {
  title: string;
  embedCode: string;
  previewImage: string; // MediaAsset ID
  status: "draft" | "published";
}

export interface PayloadInstagramPostResponse {
  message: string;
  doc: {
    id: string;
    title: string;
    embedCode: string;
    previewImage: {
      id: string;
      filename: string;
      url: string;
    };
    status: "draft" | "published";
    createdAt: string;
    updatedAt: string;
  };
}

export interface PayloadInstagramGalleryItem {
  post: string; // Instagram post ID
}

export interface PayloadEntryData {
  title: string;
  type?: string;
  /**
   * IMPORTANT: Use locationRef only, never include a 'location' field.
   * The Payload sync hook gives location precedence - if it exists (even if null),
   * it will null out both location and locationRef before processing.
   * Always omit this field if null/undefined to avoid interfering with locationRef.
   */
  locationRef?: string;
  gallery: PayloadGalleryItem[];
  instagramGallery?: PayloadInstagramGalleryItem[];
  address?: string;
  countryCode?: string;
  phoneNumber?: string;
  website?: string;
  latitude?: number;
  longitude?: number;
  status: "draft" | "published";
}

export class PayloadApiClient {
  private readonly apiUrl: string;
  private readonly serviceEmail: string;
  private readonly servicePassword: string;
  private authToken: string | null = null;
  private tokenExpiry: number | null = null;

  constructor(config: EnvConfig) {
    this.apiUrl = config.PAYLOAD_API_URL;
    this.serviceEmail = config.PAYLOAD_SERVICE_EMAIL;
    this.servicePassword = config.PAYLOAD_SERVICE_PASSWORD;
  }

  isConfigured(): boolean {
    return !!(this.apiUrl && this.serviceEmail && this.servicePassword);
  }

  /**
   * Authenticate with Payload CMS and get JWT token
   */
  async authenticate(): Promise<string> {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableError("Payload CMS");
    }

    const response = await fetch(`${this.apiUrl}/api/users/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: this.serviceEmail,
        password: this.servicePassword,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Payload authentication failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json() as PayloadAuthResponse;

    // Store token and expiry (convert Unix timestamp to milliseconds)
    this.authToken = data.token;
    this.tokenExpiry = data.exp * 1000;

    console.log(`✓ Authenticated with Payload. Token expires: ${new Date(this.tokenExpiry)}`);

    // Log the token for Postman testing
    console.log('🔑 PAYLOAD JWT TOKEN:', data.token);

    return data.token;
  }

  /**
   * Ensure we have a valid auth token, re-authenticate if expired
   */
  private async ensureAuthenticated(): Promise<string> {
    const now = Date.now();

    // If no token or token expired (with 5 minute buffer), re-authenticate
    if (!this.authToken || !this.tokenExpiry || now >= (this.tokenExpiry - 300000)) {
      console.log("🔄 Payload token expired or missing, re-authenticating...");
      await this.authenticate();
    }

    return this.authToken!;
  }

  /**
   * Upload an image to Payload (multipart/form-data)
   * Returns the MediaAsset ID to be used in gallery references
   */
  async uploadImage(
    fileBuffer: Buffer,
    filename: string,
    altText: string,
    options?: {
      locationRef?: string;
      photographerCredit?: string | null;
    }
  ): Promise<string> {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableError("Payload CMS");
    }

    const token = await this.ensureAuthenticated();

    // Create FormData for multipart upload
    const formData = new FormData();
    const blob = new Blob([fileBuffer], { type: this.getMimeType(filename) });
    formData.append("file", blob, filename);

    // Build _payload object with metadata (match working curl format exactly)
    const payload: Record<string, string | number> = {};

    // Debug: Log what we received
    console.log('🔍 [PAYLOAD CLIENT] uploadImage called with:', {
      filename,
      altText,
      options_locationRef: options?.locationRef,
      options_locationRef_type: typeof options?.locationRef,
      options_photographerCredit: options?.photographerCredit,
    });

    if (altText) {
      payload.alt_text = altText;
    }

    // Always include photographer_credit to match working curl format (even if empty)
    payload.photographer_credit = options?.photographerCredit || "";

    // Add locationRef inside _payload (as number, not string)
    if (options?.locationRef) {
      payload.locationRef = parseInt(options.locationRef, 10);
      console.log('✅ [PAYLOAD CLIENT] Added locationRef to payload:', payload.locationRef);
    } else {
      console.warn('⚠️  [PAYLOAD CLIENT] No locationRef provided, skipping');
    }

    // Always append _payload
    formData.append("_payload", JSON.stringify(payload));

    // Debug logging
    console.log('🔍 [PAYLOAD REQUEST] URL:', `${this.apiUrl}/api/media-assets`);
    console.log('🔍 [PAYLOAD REQUEST] filename:', filename);
    console.log('🔍 [PAYLOAD REQUEST] _payload:', JSON.stringify(payload, null, 2));
    console.log('🔍 [PAYLOAD REQUEST] locationRef:', options?.locationRef || 'none');

    const response = await fetch(`${this.apiUrl}/api/media-assets`, {
      method: "POST",
      headers: {
        "Authorization": `JWT ${token}`,
      },
      body: formData,
    });

    console.log('🔍 [PAYLOAD RESPONSE] Status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [PAYLOAD ERROR] Status:', response.status);
      console.error('❌ [PAYLOAD ERROR] Response:', errorText);
      throw new Error(`Payload image upload failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json() as PayloadMediaAssetResponse;

    console.log(`✓ Uploaded image to Payload: ${data.doc.filename} → ID: ${data.doc.id}`);
    console.log('🔍 [PAYLOAD RESPONSE] Full doc object:', JSON.stringify(data.doc, null, 2));
    console.log('🔍 [PAYLOAD RESPONSE] altText in response:', data.doc.altText);

    return data.doc.id;
  }

  /**
   * Find a location in Payload by locationKey and return its ID
   */
  async getLocationRefByKey(locationKey: string): Promise<string | null> {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableError("Payload CMS");
    }

    if (!locationKey) {
      return null;
    }

    const token = await this.ensureAuthenticated();
    const params = new URLSearchParams({
      "where[locationKey][equals]": locationKey,
    });

    console.log(`[Payload] Lookup locationRef`, {
      locationKey,
      url: `${this.apiUrl}/api/locations?${params.toString()}`,
    });

    const response = await fetch(`${this.apiUrl}/api/locations?${params.toString()}`, {
      method: "GET",
      headers: {
        "Authorization": `JWT ${token}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Payload] Location lookup failed", {
        locationKey,
        status: response.status,
        errorText,
      });
      throw new Error(`Payload location lookup failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json() as PayloadLocationQueryResponse;
    const firstDoc = result.docs?.[0];
    const totalDocs = result.totalDocs ?? result.docs?.length ?? 0;

    console.log("[Payload] Location lookup result", {
      locationKey,
      totalDocs,
      locationRef: firstDoc?.id || null,
    });

    return firstDoc?.id || null;
  }

  /**
   * Find an entry in a Payload collection by title
   * Used to implement upsert logic (update if exists, create if not)
   *
   * Note: Title field has unique: true constraint in all collections
   * (Dining, Accommodations, Attractions, Nightlife)
   */
  async findEntryByTitle(
    collection: "dining" | "accommodations" | "attractions" | "nightlife",
    title: string
  ): Promise<string | null> {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableError("Payload CMS");
    }

    const token = await this.ensureAuthenticated();
    const params = new URLSearchParams({
      "where[title][equals]": title,
      "limit": "1",
    });

    console.log(`[Payload] Lookup entry by title`, {
      collection,
      title,
      url: `${this.apiUrl}/api/${collection}?${params.toString()}`,
    });

    const response = await fetch(`${this.apiUrl}/api/${collection}?${params.toString()}`, {
      method: "GET",
      headers: {
        "Authorization": `JWT ${token}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Payload] Entry lookup failed", {
        collection,
        title,
        status: response.status,
        errorText,
      });
      throw new Error(`Payload entry lookup failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json() as PayloadLocationQueryResponse;
    const firstDoc = result.docs?.[0];
    const totalDocs = result.totalDocs ?? result.docs?.length ?? 0;

    console.log("[Payload] Entry lookup result", {
      collection,
      title,
      totalDocs,
      payloadDocId: firstDoc?.id || null,
    });

    return firstDoc?.id || null;
  }

  /**
   * Create a location entry in Payload
   */
  async createLocation(data: PayloadLocationCreateData): Promise<string> {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableError("Payload CMS");
    }

    const token = await this.ensureAuthenticated();

    console.log("[Payload] Create location", data);

    const response = await fetch(`${this.apiUrl}/api/locations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `JWT ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Payload] Location creation failed", {
        status: response.status,
        errorText,
      });
      throw new Error(`Payload location creation failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json() as PayloadLocationCreateResponse;

    console.log("[Payload] Location created", {
      id: result.doc.id,
      level: result.doc.level,
      locationKey: result.doc.locationKey || null,
    });

    return result.doc.id;
  }

  /**
   * Create an entry in a Payload collection
   */
  async createEntry(
    collection: "dining" | "accommodations" | "attractions" | "nightlife",
    data: PayloadEntryData
  ): Promise<PayloadEntryResponse> {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableError("Payload CMS");
    }

    const token = await this.ensureAuthenticated();

    console.log("[Payload] Create entry", {
      collection,
      title: data.title,
      type: data.type,
      locationRef: data.locationRef,
      gallery: data.gallery,
      instagramGallery: data.instagramGallery,
      status: data.status,
    });

    const response = await fetch(`${this.apiUrl}/api/${collection}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `JWT ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Payload] Entry creation failed", {
        collection,
        status: response.status,
        errorText,
      });
      throw new Error(`Payload entry creation failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json() as PayloadEntryResponse;

    console.log(`✓ Created ${collection} entry in Payload: ${result.doc.title} → ID: ${result.doc.id}`);

    return result;
  }

  /**
   * Update an existing entry in a Payload collection
   */
  async updateEntry(
    collection: "dining" | "accommodations" | "attractions" | "nightlife",
    docId: string,
    data: PayloadEntryData
  ): Promise<PayloadEntryResponse> {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableError("Payload CMS");
    }

    const token = await this.ensureAuthenticated();

    console.log("[Payload] Update entry", {
      collection,
      docId,
      title: data.title,
      type: data.type,
      locationRef: data.locationRef,
      galleryCount: data.gallery?.length || 0,
      instagramGalleryCount: data.instagramGallery?.length || 0,
    });

    const response = await fetch(`${this.apiUrl}/api/${collection}/${docId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `JWT ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Payload] Entry update failed", {
        collection,
        docId,
        status: response.status,
        errorText,
      });
      throw new Error(`Payload entry update failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json() as PayloadEntryResponse;

    console.log(`✓ Updated ${collection} entry in Payload: ${result.doc.title} → ID: ${result.doc.id}`);

    return result;
  }

  /**
   * Upsert an entry in a Payload collection (update if exists, create if not)
   * Uses title as the unique identifier to determine existence
   *
   * @param collection - The Payload collection name
   * @param data - The entry data to create/update
   * @returns The response from create or update operation
   */
  async upsertEntry(
    collection: "dining" | "accommodations" | "attractions" | "nightlife",
    data: PayloadEntryData
  ): Promise<PayloadEntryResponse> {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableError("Payload CMS");
    }

    console.log(`[Payload] Upserting entry in ${collection}`, {
      title: data.title,
    });

    // Step 1: Check if entry exists by title (unique constraint field)
    const existingDocId = await this.findEntryByTitle(collection, data.title);

    // Step 2: Update if exists, create if not
    if (existingDocId) {
      console.log(`[Payload] Entry exists, updating`, {
        collection,
        docId: existingDocId,
        title: data.title,
      });

      return await this.updateEntry(collection, existingDocId, data);
    } else {
      console.log(`[Payload] Entry doesn't exist, creating`, {
        collection,
        title: data.title,
      });

      return await this.createEntry(collection, data);
    }
  }

  /**
   * Create an Instagram post in Payload
   * Returns the Instagram post ID to be used in instagramGallery references
   */
  async createInstagramPost(data: PayloadInstagramPostData): Promise<string> {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableError("Payload CMS");
    }

    const token = await this.ensureAuthenticated();

    const response = await fetch(`${this.apiUrl}/api/instagram-posts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `JWT ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Payload Instagram post creation failed: ${response.status} - ${errorText}`
      );
    }

    const result = await response.json() as PayloadInstagramPostResponse;

    console.log(`✓ Created Instagram post in Payload: ${result.doc.title} → ID: ${result.doc.id}`);

    return result.doc.id;
  }

  /**
   * Helper: Get MIME type from filename extension
   */
  private getMimeType(filename: string): string {
    const ext = filename.split(".").pop()?.toLowerCase();

    switch (ext) {
      case "jpg":
      case "jpeg":
        return "image/jpeg";
      case "png":
        return "image/png";
      case "webp":
        return "image/webp";
      default:
        return "image/jpeg"; // Default fallback
    }
  }
}
