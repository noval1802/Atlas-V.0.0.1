import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { unzipSync } from "fflate";

const devUsername = process.env.DEV_LOGIN_USERNAME;
const devPassword = process.env.DEV_LOGIN_PASSWORD;

test.skip(
  !devUsername || !devPassword,
  "login development tidak diaktifkan pada target ini (set DEV_LOGIN_USERNAME dan DEV_LOGIN_PASSWORD)",
);

async function loginWithDevelopmentAccount(page: Page) {
  await page.goto("/login");
  await page.locator('input[name="username"]').fill(devUsername ?? "");
  await page.locator('input[name="password"]').fill(devPassword ?? "");
  await page.getByRole("button", { name: /login development/i }).click();
  await page.waitForURL(/\/dashboard/);
}

test("ekspor PNG dan PPTX BANGSIT menghasilkan berkas yang valid", async ({ page }) => {
  test.setTimeout(120_000);
  await loginWithDevelopmentAccount(page);
  await page.goto("/bangsit");

  await page.getByLabel("Lokasi").fill("Jakarta Selatan");
  await page.getByLabel("Latitude").fill("-6.2615");
  await page.getByLabel("Longitude").fill("106.8105");
  await page.getByLabel("Kronologi").fill("Banjir lokal terjadi pada pagi hari dan ditangani tim lapangan.");
  await page.getByRole("button", { name: "Preview" }).click();
  await expect(page.getByText("RINGKASAN OPERASIONAL")).toBeVisible();

  const pngDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "PNG" }).click();
  const pngFile = await (await pngDownload).path();
  expect(pngFile).toBeTruthy();
  const png = readFileSync(pngFile as string);
  expect([...png.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  expect(png.byteLength).toBeGreaterThan(10_000);

  const pptxDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "PPTX" }).click();
  const pptxFile = await (await pptxDownload).path();
  expect(pptxFile).toBeTruthy();
  const archive = unzipSync(new Uint8Array(readFileSync(pptxFile as string)));
  expect(archive["ppt/media/image1.png"]).toBeTruthy();
  expect(archive["ppt/slides/slide1.xml"]).toBeTruthy();
});

test("filter laporan menyaring daftar di server", async ({ page }) => {
  test.setTimeout(120_000);
  await loginWithDevelopmentAccount(page);
  await page.goto("/reports");

  const judul = `Laporan e2e filter ${Date.now()}`;
  await page.getByPlaceholder("Judul laporan").fill(judul);
  await page
    .getByPlaceholder("Ringkasan laporan")
    .fill("Ringkasan laporan uji yang dibuat oleh pengujian browser end to end.");
  await page.getByRole("button", { name: /buat draft/i }).click();
  await expect(page.getByText(judul)).toBeVisible();

  await page.getByLabel("Filter pencarian").fill(judul);
  await expect(page.locator("table tbody tr")).toHaveCount(1);
  await expect(page.getByText(judul)).toBeVisible();

  await page.getByLabel("Filter pencarian").fill("tidak-ada-laporan-yang-cocok-xyz");
  await expect(page.getByText("Tidak ada laporan yang cocok dengan filter.")).toBeVisible();

  await page.getByRole("button", { name: /reset filter/i }).click();
  await expect(page.getByLabel("Filter pencarian")).toHaveValue("");
});
