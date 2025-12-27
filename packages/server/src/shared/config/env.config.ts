export class EnvConfig {
  private static instance: EnvConfig;

  readonly GOOGLE_MAPS_API_KEY: string;
  readonly RAPID_API_KEY: string;
  readonly GEOAPIFY_API_KEY: string;
  readonly PORT: number;
  readonly NODE_ENV: string;

  private constructor() {
    this.GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || "";
    this.RAPID_API_KEY = process.env.RAPID_API_KEY || "";
    this.GEOAPIFY_API_KEY = process.env.GEOAPIFY_API_KEY || "";
    this.PORT = Number(process.env.PORT || 3000);
    this.NODE_ENV = process.env.NODE_ENV || "development";

    this.validate();
  }

  static getInstance(): EnvConfig {
    if (!EnvConfig.instance) {
      EnvConfig.instance = new EnvConfig();
    }
    return EnvConfig.instance;
  }

  private validate(): void {
    const warnings: string[] = [];

    if (!this.GOOGLE_MAPS_API_KEY) {
      warnings.push("GOOGLE_MAPS_API_KEY not set - geocoding disabled");
    }

    if (!this.RAPID_API_KEY) {
      warnings.push("RAPID_API_KEY not set - Instagram media download disabled");
    }

    if (!this.GEOAPIFY_API_KEY) {
      warnings.push("GEOAPIFY_API_KEY not set - Brazil reverse geocoding may fail");
    }

    if (warnings.length > 0 && this.NODE_ENV !== "test") {
      console.warn("Configuration warnings:", warnings.join(", "));
    }
  }

  hasGoogleMapsKey(): boolean {
    return !!this.GOOGLE_MAPS_API_KEY;
  }

  hasRapidApiKey(): boolean {
    return !!this.RAPID_API_KEY;
  }

  hasGeoapifyKey(): boolean {
    return !!this.GEOAPIFY_API_KEY;
  }
}
