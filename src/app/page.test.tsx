// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import Home from "./page";

function mockResponse(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    modelChoice: "maintenance",
    confidence: 0.9,
    probabilities: { maintenance: 0.9, quality: 0.04, logistics: 0.03, human_review: 0.03 },
    model: "jev-test",
    upstreamRoundTripMs: 250,
    routing: { finalTeam: "maintenance", reasonCode: "direct_route", threshold: 0.7 },
    ...overrides,
  };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

beforeAll(() => {
  // jsdom does not implement these; the app calls them only from explicit
  // click handlers (scroll/focus on selection), so stub them harmlessly.
  Element.prototype.scrollIntoView = vi.fn();
  if (!window.matchMedia) {
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
  }
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function getPresentationToggle() {
  return screen.getByRole("switch", { name: "Presentation view" });
}

/** The decision panel renders "Report" then the report text as its next sibling paragraph. */
function decisionPanelReportText(): string | null | undefined {
  return screen.getByText("Report", { selector: "p" }).nextElementSibling?.textContent;
}

function analyzedCount(): string | null | undefined {
  return screen.getByText("Analyzed").nextElementSibling?.textContent;
}

describe("Home — Presentation view toggle", () => {
  it("switching to Presentation view triggers no fetch calls", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(<Home />);
    fireEvent.click(getPresentationToggle());

    expect(fetchMock).not.toHaveBeenCalled();
    expect(getPresentationToggle()).toHaveAttribute("aria-checked", "true");
  });

  it("preserves session results and the selected incident across a view switch", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(mockResponse()));
    vi.stubGlobal("fetch", fetchMock);

    render(<Home />);

    const textarea = screen.getByLabelText("Operator report");
    fireEvent.change(textarea, { target: { value: "The conveyor keeps grinding." } });
    fireEvent.click(screen.getByRole("button", { name: "Analyze incident" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(decisionPanelReportText()).toBe("The conveyor keeps grinding."));
    expect(analyzedCount()).toBe("1");

    // Switch into Presentation view.
    fireEvent.click(getPresentationToggle());

    // The same report and its result are still shown in the decision panel,
    // and no additional fetch was made just from switching views.
    expect(decisionPanelReportText()).toBe("The conveyor keeps grinding.");
    expect(analyzedCount()).toBe("1");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Switch back — still intact, still no extra fetch.
    fireEvent.click(getPresentationToggle());
    expect(decisionPanelReportText()).toBe("The conveyor keeps grinding.");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("disables the toggle while a request is active, and re-enables it once settled", async () => {
    let resolveFetch: ((response: Response) => void) | null = null;
    const fetchMock = vi.fn().mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<Home />);

    const textarea = screen.getByLabelText("Operator report");
    fireEvent.change(textarea, { target: { value: "Something is wrong." } });
    fireEvent.click(screen.getByRole("button", { name: "Analyze incident" }));

    await waitFor(() => expect(getPresentationToggle()).toBeDisabled());

    await act(async () => {
      resolveFetch!(jsonResponse(mockResponse()));
      await Promise.resolve();
      await Promise.resolve();
    });

    await waitFor(() => expect(getPresentationToggle()).not.toBeDisabled());
  });
});
