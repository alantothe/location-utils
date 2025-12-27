import { deleteLocationBySlug, deleteLocationById } from "../repositories/location.repository";

export class LocationMutationService {
  deleteLocationBySlug(slug: string): boolean {
    return deleteLocationBySlug(slug);
  }

  deleteLocationById(id: number): boolean {
    return deleteLocationById(id);
  }
}


