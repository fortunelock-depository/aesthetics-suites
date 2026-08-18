-- CreateTable
CREATE TABLE "RoomTypeSharedUnit" (
    "roomTypeId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoomTypeSharedUnit_pkey" PRIMARY KEY ("roomTypeId","roomId")
);

-- CreateIndex
CREATE INDEX "RoomTypeSharedUnit_roomId_idx" ON "RoomTypeSharedUnit"("roomId");

-- AddForeignKey
ALTER TABLE "RoomTypeSharedUnit" ADD CONSTRAINT "RoomTypeSharedUnit_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES "RoomType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomTypeSharedUnit" ADD CONSTRAINT "RoomTypeSharedUnit_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;
