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
    alt_text?: string;
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
    location: string;
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

export interface PayloadGalleryItem {
  image: string; // MediaAsset ID
  altText?: string;
  caption?: string;
}

export interface PayloadEntryData {
  title: string;
  type?: string;
  location: string;
  gallery: PayloadGalleryItem[];
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
    altText?: string,
    location?: string
  ): Promise<string> {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableError("Payload CMS");
    }

    const token = await this.ensureAuthenticated();

    // Create FormData for multipart upload
    const formData = new FormData();
    const blob = new Blob([fileBuffer], { type: this.getMimeType(filename) });
    formData.append("file", blob, filename);

    if (altText) {
      formData.append("alt_text", altText);
    }

    if (location) {
      formData.append("location", location);
    }

    const response = await fetch(`${this.apiUrl}/api/media-assets`, {
      method: "POST",
      headers: {
        "Authorization": `JWT ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Payload image upload failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json() as PayloadMediaAssetResponse;

    console.log(`✓ Uploaded image to Payload: ${data.doc.filename} → ID: ${data.doc.id}`);

    return data.doc.id;
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
      throw new Error(`Payload entry creation failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json() as PayloadEntryResponse;

    console.log(`✓ Created ${collection} entry in Payload: ${result.doc.title} → ID: ${result.doc.id}`);

    return result;
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
