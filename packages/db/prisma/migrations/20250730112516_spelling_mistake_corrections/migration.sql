/*
  Warnings:

  - You are about to drop the column `mesage` on the `chat` table. All the data in the column will be lost.
  - Added the required column `message` to the `chat` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "chat" DROP COLUMN "mesage",
ADD COLUMN     "message" TEXT NOT NULL;
