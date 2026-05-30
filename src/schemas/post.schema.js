import { z } from "zod";

export const postFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required.").max(140),
  status: z.enum(["draft", "published"]),
  tags: z.array(z.string().trim().min(1)).default([]),
});
