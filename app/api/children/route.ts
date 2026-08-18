import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  authorizedClassIds,
  hasPermission,
  requirePermission,
} from "@/lib/permissions";
import { childSchema } from "@/lib/validation";
import { apiError } from "@/lib/api";
import { assertCanAddChildren } from "@/lib/subscriptions/service";

export async function GET() {
  try {
    const user = await requirePermission("children.read");
    const classIds = await authorizedClassIds(user);
    const where = {
      organizationId: user.organizationId,
      ...(classIds ? { classId: { in: classIds } } : {}),
    };
    if (!hasPermission(user.role, "children.medical.read")) {
      return NextResponse.json(
        await prisma.child.findMany({
          where,
          select: {
            id: true,
            firstName: true,
            lastName: true,
            birthDate: true,
            classId: true,
            active: true,
            class: { select: { id: true, name: true } },
          },
          orderBy: { lastName: "asc" },
        }),
      );
    }
    return NextResponse.json(
      await prisma.child.findMany({
        where,
        include: { class: true, parents: { include: { parent: true } } },
        orderBy: { lastName: "asc" },
      }),
    );
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requirePermission("children.create");
    const input = childSchema.parse(await request.json());
    const child = await prisma.$transaction(
      async (tx) => {
        await assertCanAddChildren(user.organizationId, 1, tx);
        if (
          input.classId &&
          !(await tx.classRoom.findFirst({
            where: { id: input.classId, organizationId: user.organizationId },
          }))
        ) {
          throw new Error("Not found");
        }
        const created = await tx.child.create({
          data: { ...input, organizationId: user.organizationId },
        });
        await tx.auditLog.create({
          data: {
            organizationId: user.organizationId,
            userId: user.id,
            action: "CREATE",
            entity: "Child",
            entityId: created.id,
          },
        });
        return created;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    return NextResponse.json(child, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
