import { deleteLocationBySlug } from "../repositories/location.repository";

export class LocationMutationService {
  deleteLocationBySlug(slug: string): boolean {
    return deleteLocationBySlug(slug);
  }
}


