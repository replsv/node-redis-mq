describe("Dotenv proxy", () => {
  beforeAll(async () => {
    await require("./dotenv");
  });

  test("Check HTTP port is defined", () => {
    expect(process.env.HTTP_PORT).toBeDefined();
  });
});
