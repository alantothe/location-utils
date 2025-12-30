import { z } from "zod";

export const addUploadFilesSchema = z.object({
  photographerCredit: z.string().optional(),
});

export type AddUploadFilesFormData = z.infer<typeof addUploadFilesSchema>;
