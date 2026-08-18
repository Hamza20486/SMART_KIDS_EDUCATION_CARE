CREATE TABLE "FeeCategory" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FeeCategory_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FeeCategory_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "FeeCategory_organizationId_code_key" ON "FeeCategory"("organizationId", "code");
CREATE UNIQUE INDEX "FeeCategory_organizationId_id_key" ON "FeeCategory"("organizationId", "id");

ALTER TABLE "Payment"
  ADD COLUMN "categoryId" TEXT,
  ADD COLUMN "academicPeriod" TEXT,
  ADD COLUMN "description" TEXT,
  ADD COLUMN "grossAmountCentimes" INTEGER,
  ADD COLUMN "discountCentimes" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "installmentNumber" INTEGER,
  ADD COLUMN "installmentCount" INTEGER;
UPDATE "Payment" SET "grossAmountCentimes" = "amountCentimes";
ALTER TABLE "Payment" ALTER COLUMN "grossAmountCentimes" SET NOT NULL;
CREATE UNIQUE INDEX "Payment_organizationId_id_key" ON "Payment"("organizationId", "id");
CREATE INDEX "Payment_organizationId_academicPeriod_idx" ON "Payment"("organizationId", "academicPeriod");
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_parentId_fkey";
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_childId_fkey";
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_parent_fkey" FOREIGN KEY ("organizationId", "parentId") REFERENCES "Parent"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_child_fkey" FOREIGN KEY ("organizationId", "childId") REFERENCES "Child"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_category_fkey" FOREIGN KEY ("organizationId", "categoryId") REFERENCES "FeeCategory"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "PaymentTransaction" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "paymentId" TEXT NOT NULL,
  "amountCentimes" INTEGER NOT NULL,
  "method" TEXT NOT NULL,
  "reference" TEXT,
  "notes" TEXT,
  "recordedById" TEXT NOT NULL,
  "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaymentTransaction_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PaymentTransaction_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PaymentTransaction_payment_fkey" FOREIGN KEY ("organizationId", "paymentId") REFERENCES "Payment"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PaymentTransaction_recorder_fkey" FOREIGN KEY ("organizationId", "recordedById") REFERENCES "User"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PaymentTransaction_organizationId_id_key" ON "PaymentTransaction"("organizationId", "id");
CREATE INDEX "PaymentTransaction_organizationId_paymentId_paidAt_idx" ON "PaymentTransaction"("organizationId", "paymentId", "paidAt");

ALTER TABLE "PaymentReceipt"
  ADD COLUMN "transactionId" TEXT,
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'ISSUED',
  ADD COLUMN "voidedAt" TIMESTAMP(3),
  ADD COLUMN "voidReason" TEXT,
  ADD COLUMN "reissuedFromId" TEXT;
ALTER TABLE "PaymentReceipt" DROP CONSTRAINT "PaymentReceipt_paymentId_fkey";
ALTER TABLE "PaymentReceipt" DROP CONSTRAINT "PaymentReceipt_issuedById_fkey";
ALTER TABLE "PaymentReceipt" ADD CONSTRAINT "PaymentReceipt_payment_fkey" FOREIGN KEY ("organizationId", "paymentId") REFERENCES "Payment"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentReceipt" ADD CONSTRAINT "PaymentReceipt_transaction_fkey" FOREIGN KEY ("organizationId", "transactionId") REFERENCES "PaymentTransaction"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentReceipt" ADD CONSTRAINT "PaymentReceipt_issuer_fkey" FOREIGN KEY ("organizationId", "issuedById") REFERENCES "User"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentReceipt" ADD CONSTRAINT "PaymentReceipt_reissuedFrom_fkey" FOREIGN KEY ("reissuedFromId") REFERENCES "PaymentReceipt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "PaymentReceipt_organizationId_paymentId_status_idx" ON "PaymentReceipt"("organizationId", "paymentId", "status");

CREATE TABLE "ReceiptSequence" (
  "organizationId" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "nextNumber" INTEGER NOT NULL DEFAULT 1,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ReceiptSequence_pkey" PRIMARY KEY ("organizationId", "year"),
  CONSTRAINT "ReceiptSequence_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
