import { EventEmitter } from "events";
import { registerScheduleToStorage } from "./scheduler";

describe("Scheduler middleware / observer", () => {
  let app;
  beforeAll(async () => {
    app = new EventEmitter();
  });

  test("Test middleware registration", () => {
    registerScheduleToStorage(app);
    expect(app._eventsCount).toBe(1);
  });
});
