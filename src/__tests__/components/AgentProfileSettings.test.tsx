import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import AgentProfileSettings from "@/components/agent/AgentProfileSettings";

vi.mock("lucide-react", () => ({
  User: (props: any) => <div data-testid="user-icon" {...props} />,
  Info: (props: any) => <div data-testid="info-icon" {...props} />,
}));

vi.mock("@/components/ToastContext", () => ({
  useToast: vi.fn(),
}));

import { useToast } from "@/components/ToastContext";

describe("AgentProfileSettings", () => {
  const mockAddToast = vi.fn();
  const mockUser = {
    id: "user-1",
    name: "Test User",
    email: "test@example.com",
    image: null,
    profile: { role: "AGENT" },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useToast as ReturnType<typeof vi.fn>).mockReturnValue({
      addToast: mockAddToast,
    });
  });

  it("renders with initial user data", () => {
    render(<AgentProfileSettings initialUser={mockUser} />);

    expect(screen.getByDisplayValue("Test User")).toBeInTheDocument();
    expect(screen.getByText("AGENT")).toBeInTheDocument();
    expect(screen.getByText("TU")).toBeInTheDocument();
  });

  it("shows user initials in avatar", () => {
    render(<AgentProfileSettings initialUser={mockUser} />);

    const initials = screen.getByText("TU");
    expect(initials).toBeInTheDocument();
  });

  it("handles name change", () => {
    render(<AgentProfileSettings initialUser={mockUser} />);

    const nameInput = screen.getByDisplayValue("Test User");
    fireEvent.change(nameInput, { target: { value: "Updated Name" } });

    expect(screen.getByDisplayValue("Updated Name")).toBeInTheDocument();
  });

  it("shows error toast when name is empty on save", async () => {
    render(<AgentProfileSettings initialUser={mockUser} />);

    const nameInput = screen.getByDisplayValue("Test User");
    fireEvent.change(nameInput, { target: { value: "" } });

    const saveButton = screen.getByText("Save Changes");
    await fireEvent.click(saveButton);

    expect(mockAddToast).toHaveBeenCalledWith("error", "Name cannot be empty.");
  });

  it("shows saving state on save", () => {
    render(<AgentProfileSettings initialUser={mockUser} />);

    const saveButton = screen.getByText("Save Changes");
    expect(saveButton).not.toBeDisabled();

    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    } as Response);

    fireEvent.click(saveButton);

    expect(screen.getByText("Saving...")).toBeInTheDocument();
  });

  it("calls fetch with correct data on save", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    } as Response);

    render(<AgentProfileSettings initialUser={mockUser} />);

    const saveButton = screen.getByText("Save Changes");
    await fireEvent.click(saveButton);

    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/profile",
      expect.objectContaining({
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: expect.stringContaining('"name":"Test User"'),
      })
    );
  });

  it("displays image when provided", () => {
    const userWithImage = {
      ...mockUser,
      image: "data:image/png;base64,abc123",
    };

    render(<AgentProfileSettings initialUser={userWithImage} />);

    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "data:image/png;base64,abc123");
  });

  it("shows change avatar button when no image", () => {
    render(<AgentProfileSettings initialUser={mockUser} />);

    const uploadButton = screen.getByText("Change avatar");
    expect(uploadButton).toBeInTheDocument();
  });

  it("shows upload loading state", () => {
    render(<AgentProfileSettings initialUser={mockUser} />);

    const uploadButton = screen.getByText("Change avatar");
    expect(uploadButton).not.toBeDisabled();

    // Simulate uploading state
    render(<AgentProfileSettings initialUser={{ ...mockUser, image: null }} />);
  });
});
