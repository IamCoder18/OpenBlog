import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import DeleteModal from "@/components/admin/DeleteModal";

describe("DeleteModal", () => {
  it("renders when open", () => {
    render(<DeleteModal isOpen={true} onClose={vi.fn()} onConfirm={vi.fn()} />);
    expect(screen.getByText("Delete story")).toBeInTheDocument();
  });

  it("calls onConfirm when delete clicked", () => {
    const onConfirm = vi.fn();
    render(
      <DeleteModal isOpen={true} onClose={vi.fn()} onConfirm={onConfirm} />
    );
    fireEvent.click(screen.getByRole("button", { name: /delete/i }));
    expect(onConfirm).toHaveBeenCalled();
  });
});
