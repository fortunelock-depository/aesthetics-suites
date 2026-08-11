// src/components/admin/rooms/room-photos-card.tsx
'use client';

import { PhotosManager } from '@/components/admin/photos-manager';
import {
  useAddRoomTypePhotosMutation,
  useDeleteRoomTypePhotoMutation,
} from '@/redux/rooms-api';
import type { IRoomTypeDetail } from '@/types/room.types';

/** The Photos tab: the shared gallery manager on the rooms endpoints. */
export function RoomPhotosCard({ roomType }: { roomType: IRoomTypeDetail }) {
  const [addPhotos, { isLoading: isUploading }] =
    useAddRoomTypePhotosMutation();
  const [deletePhoto, { isLoading: isDeleting }] =
    useDeleteRoomTypePhotoMutation();

  return (
    <PhotosManager
      photos={roomType.photos}
      entityName={roomType.name}
      description="The first photo is the cover shown on room cards and lists."
      uploading={isUploading}
      deleting={isDeleting}
      onUpload={(formData) =>
        addPhotos({ id: roomType.id, formData }).unwrap()
      }
      onDelete={(photoId) =>
        deletePhoto({ roomTypeId: roomType.id, photoId }).unwrap()
      }
    />
  );
}
