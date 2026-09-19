import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppNavigation } from "./app-navigation";

const route = vi.hoisted(() => ({ pathname: "/" }));
vi.mock("next/navigation", () => ({ usePathname: () => route.pathname }));

describe("primary navigation", () => {
  it("exposes all five destinations as named links", () => {
    route.pathname = "/";
    render(<AppNavigation />);
    expect(
      screen.getByRole("navigation", { name: "Hauptnavigation" }),
    ).toBeInTheDocument();
    for (const [label, href] of [
      ["Home", "/"],
      ["Money", "/money"],
      ["Plan", "/plan"],
      ["Goals", "/goals"],
      ["AI", "/ai"],
    ]) {
      expect(screen.getByRole("link", { name: label })).toHaveAttribute(
        "href",
        href,
      );
    }
    expect(screen.getByRole("link", { current: "page" })).toHaveAccessibleName(
      "Home",
    );
  });

  it("marks only the parent section for nested routes", () => {
    route.pathname = "/money/budgets";
    render(<AppNavigation />);
    expect(screen.getAllByRole("link", { current: "page" })).toHaveLength(1);
    expect(screen.getByRole("link", { current: "page" })).toHaveAccessibleName(
      "Money",
    );
  });

  it("does not mark a section for a route that merely shares its prefix", () => {
    route.pathname = "/money-other";
    render(<AppNavigation />);
    expect(
      screen.queryByRole("link", { current: "page" }),
    ).not.toBeInTheDocument();
  });
});
