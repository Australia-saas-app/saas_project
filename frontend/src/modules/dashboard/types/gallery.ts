export interface GalleryMedia {
  url?: string;
  size?: number;
  type?: string;
  fileName?: string;
  mimeType?: string;
}

export interface GalleryImageItem {
  altText?: string;
  imageUrl?: string;
  displayOrder?: number;
}

export interface GalleryCreator {
  fullName?: string;
  email?: string;
}

export interface GalleryImage {
  id?: string;
  title?: string | null;
  description?: string | null;
  category?: string | null;
  categoryName?: string | null;
  media?: GalleryMedia | null;
  images?: GalleryImageItem[];
  isVisible?: boolean;
  createdAt?: string;
  updatedAt?: string;
  creator?: GalleryCreator | null;
}
