import { createUUID } from "../../utils/uuid";

test("uuid generation", () => {
  const uuid = createUUID();
  expect(uuid.length).toBe(36);
  expect(uuid.split("-").length).toBe(5);
});
