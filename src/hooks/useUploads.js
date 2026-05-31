import { useMutation } from "@tanstack/react-query";
import { uploadEditorAsset } from "../api/index.js";

export function useUploadImage() {
  return useMutation({
    mutationFn: uploadEditorAsset,
  });
}
