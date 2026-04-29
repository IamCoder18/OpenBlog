import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import AgentSidebar from "@/components/agent/AgentSidebar";

describe("AgentSidebar", () => {
  it("renders sidebar navigation", () => {
    render(
      <AgentSidebar
        activeTab="profile"
        userName="Test User"
        userImage="/test.jpg"
      />
    );
    expect(screen.getByRole("navigation")).toBeInTheDocument();
  });
});
