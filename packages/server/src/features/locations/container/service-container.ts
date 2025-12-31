import { EnvConfig } from "@server/shared/config/env.config";
import { ImageStorageService } from "@server/shared/services/storage/image-storage.service";
import { InstagramApiClient } from "@server/shared/services/external/instagram-api.client";
import { PayloadApiClient } from "@server/shared/services/external/payload-api.client";
import { BigDataCloudClient } from "@server/shared/services/external/bigdatacloud-api.client";
import { GeoapifyClient } from "@server/shared/services/external/geoapify-api.client";
import { MapsService } from "../services/maps.service";
import { InstagramService } from "../services/instagram.service";
import { UploadsService } from "../services/uploads.service";
import { LocationQueryService } from "../services/location-query.service";
import { LocationMutationService } from "../services/location-mutation.service";
import { TaxonomyService } from "../services/taxonomy.service";
import { DistrictExtractionService } from "../services/district-extraction.service";
import { TaxonomyCorrectionService } from "../services/taxonomy-correction.service";
import { PayloadSyncService } from "../services/payload-sync.service";

export class ServiceContainer {
  private static instance: ServiceContainer;

  readonly config: EnvConfig;
  readonly imageStorage: ImageStorageService;
  readonly imageStorageService: ImageStorageService; // Alias for consistency with admin controllers
  readonly instagramApi: InstagramApiClient;
  readonly payloadApi: PayloadApiClient;
  readonly bigDataCloudClient: BigDataCloudClient;
  readonly geoapifyClient: GeoapifyClient;
  readonly districtExtractionService: DistrictExtractionService;
  readonly taxonomyService: TaxonomyService;
  readonly taxonomyCorrectionService: TaxonomyCorrectionService;
  readonly mapsService: MapsService;
  readonly instagramService: InstagramService;
  readonly uploadsService: UploadsService;
  readonly locationQueryService: LocationQueryService;
  readonly locationMutationService: LocationMutationService;
  readonly payloadSyncService: PayloadSyncService;

  private constructor() {
    // Singletons
    this.config = EnvConfig.getInstance();
    this.imageStorage = new ImageStorageService();
    this.imageStorageService = this.imageStorage; // Alias for consistency
    this.instagramApi = new InstagramApiClient(this.config);
    this.payloadApi = new PayloadApiClient(this.config);
    this.bigDataCloudClient = new BigDataCloudClient();
    this.geoapifyClient = new GeoapifyClient(this.config.GEOAPIFY_API_KEY || "");
    this.districtExtractionService = new DistrictExtractionService();
    this.taxonomyService = new TaxonomyService();
    this.taxonomyCorrectionService = new TaxonomyCorrectionService();

    // Services with dependencies
    this.mapsService = new MapsService(
      this.config,
      this.taxonomyService,
      this.taxonomyCorrectionService
    );
    this.instagramService = new InstagramService(
      this.instagramApi,
      this.imageStorage
    );
    this.uploadsService = new UploadsService(this.imageStorage);
    this.locationQueryService = new LocationQueryService();
    this.locationMutationService = new LocationMutationService(this.imageStorage);
    this.payloadSyncService = new PayloadSyncService(
      this.payloadApi,
      this.imageStorage,
      this.locationQueryService
    );
  }

  static getInstance(): ServiceContainer {
    if (!ServiceContainer.instance) {
      ServiceContainer.instance = new ServiceContainer();
    }
    return ServiceContainer.instance;
  }
}
