import { describe, expect, it } from "vitest";
import {
  absenceSchema,
  activitySchema,
  announcementSchema,
  attendanceSchema,
  childSchema,
  classSchema,
  complaintSchema,
  homeworkSchema,
  parentSchema,
  paymentSchema,
  staffSchema,
} from "@/lib/validation";

describe("domain validation boundaries", () => {
  it("trims child names and normalizes an empty class", () => {
    const child = childSchema.parse({
      firstName: "  Yasmine ",
      lastName: " Alaoui ",
      birthDate: "2022-04-10",
      classId: "",
    });
    expect(child).toMatchObject({
      firstName: "Yasmine",
      lastName: "Alaoui",
      classId: null,
    });
    expect(child.birthDate).toBeInstanceOf(Date);
  });

  it("rejects invalid child and class boundaries", () => {
    expect(childSchema.safeParse({ firstName: "A", lastName: "B", birthDate: "bad" }).success).toBe(false);
    expect(classSchema.safeParse({ name: "Petite section", capacity: 0 }).success).toBe(false);
    expect(classSchema.safeParse({ name: "Petite section", capacity: 51 }).success).toBe(false);
    expect(classSchema.parse({ name: " Petite section ", capacity: "20" })).toMatchObject({
      name: "Petite section",
      capacity: 20,
    });
  });

  it("validates parent contact data and applies the relationship default", () => {
    const parent = parentSchema.parse({
      firstName: "Sara",
      lastName: "Alaoui",
      phone: "0600000000",
      email: "",
    });
    expect(parent.relationship).toBe("Parent");
    expect(parentSchema.safeParse({ ...parent, phone: "123" }).success).toBe(false);
    expect(parentSchema.safeParse({ ...parent, email: "invalid" }).success).toBe(false);
  });

  it("accepts only supported attendance statuses and bounded notes", () => {
    expect(attendanceSchema.safeParse({ childId: "child-a", date: "2026-08-17", status: "EXCUSED" }).success).toBe(true);
    expect(attendanceSchema.safeParse({ childId: "child-a", date: "2026-08-17", status: "UNKNOWN" }).success).toBe(false);
    expect(attendanceSchema.safeParse({ childId: "child-a", date: "2026-08-17", status: "PRESENT", note: "x".repeat(501) }).success).toBe(false);
  });

  it("coerces activity visibility without treating arbitrary strings as booleans", () => {
    const base = {
      title: "Peinture",
      description: "Atelier de peinture",
      activityDate: "2026-08-17",
    };
    expect(activitySchema.parse({ ...base, visibleToParents: "true" }).visibleToParents).toBe(true);
    expect(activitySchema.parse({ ...base, visibleToParents: "false" }).visibleToParents).toBe(false);
    expect(activitySchema.safeParse({ ...base, visibleToParents: "yes" }).success).toBe(false);
  });

  it("requires complete homework data", () => {
    const valid = {
      title: "Coloriage",
      description: "Terminer la page deux",
      dueDate: "2026-08-20",
      classId: "class-a",
    };
    expect(homeworkSchema.safeParse(valid).success).toBe(true);
    expect(homeworkSchema.safeParse({ ...valid, classId: "" }).success).toBe(false);
    expect(homeworkSchema.safeParse({ ...valid, description: "x".repeat(2_001) }).success).toBe(false);
  });

  it("rejects reversed absence periods", () => {
    const base = {
      childId: "child-a",
      reason: "Consultation médicale",
    };
    expect(absenceSchema.safeParse({ ...base, startDate: "2026-08-17", endDate: "2026-08-18" }).success).toBe(true);
    const reversed = absenceSchema.safeParse({ ...base, startDate: "2026-08-18", endDate: "2026-08-17" });
    expect(reversed.success).toBe(false);
    if (!reversed.success) expect(reversed.error.issues[0]?.message).toBe("End date must follow start date");
  });

  it("normalizes an empty complaint child and rejects short content", () => {
    const complaint = complaintSchema.parse({
      childId: "",
      category: "Accueil",
      subject: "Question",
      message: "Merci de me rappeler.",
    });
    expect(complaint.childId).toBeNull();
    expect(complaintSchema.safeParse({ ...complaint, message: "x" }).success).toBe(false);
  });

  it("coerces valid payment amounts and installment numbers", () => {
    const payment = paymentSchema.parse({
      parentId: "parent-a",
      childId: "child-a",
      grossAmountDh: "1200.50",
      discountDh: "50",
      dueDate: "2026-09-01",
      installmentNumber: "1",
      installmentCount: "3",
    });
    expect(payment).toMatchObject({
      grossAmountDh: 1200.5,
      discountDh: 50,
      installmentNumber: 1,
      installmentCount: 3,
    });
    expect(paymentSchema.safeParse({ ...payment, grossAmountDh: 0 }).success).toBe(false);
    expect(paymentSchema.safeParse({ ...payment, installmentNumber: 1.5 }).success).toBe(false);
  });

  it("validates announcement audiences", () => {
    const announcement = {
      title: "Réunion",
      content: "Réunion vendredi à dix heures.",
      audience: "CLASS",
      classId: "class-a",
    };
    expect(announcementSchema.safeParse(announcement).success).toBe(true);
    expect(announcementSchema.safeParse({ ...announcement, audience: "PUBLIC" }).success).toBe(false);
  });

  it("enforces staff roles, email, and password length", () => {
    const staff = {
      name: "Mme Sara",
      email: "sara@example.test",
      role: "TEACHER",
      password: "VerySecure123!",
    };
    expect(staffSchema.safeParse(staff).success).toBe(true);
    expect(staffSchema.safeParse({ ...staff, role: "PARENT" }).success).toBe(false);
    expect(staffSchema.safeParse({ ...staff, password: "short" }).success).toBe(false);
  });
});
