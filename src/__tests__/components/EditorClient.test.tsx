import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "../mocks/browser";
import { handlers } from "../mocks/handlers";
import { ToastProvider } from "../../components/ToastContext";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(""),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import EditorClient from "../../app/dashboard/editor/EditorClient";

function renderWithToast(ui: React.ReactElement) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}

let server: ReturnType<typeof setupServer>;

beforeAll(async () => {
  server = await setupServer();
  server.use(...handlers);
  server.listen();
});

afterAll(() => {
  server.close();
});

let consoleSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  consoleSpy.mockRestore();
  server.resetHandlers();
  mockPush.mockClear();
});

describe("EditorClient", () => {
  describe("Renders core elements", () => {
    it("renders OpenBlog logo", () => {
      renderWithToast(<EditorClient />);

      const logo = screen.getByText("OpenBlog");
      expect(logo).toBeInTheDocument();
      expect(logo).toHaveAttribute("href", "/");
    });

    it("renders Drafting Suite label", () => {
      renderWithToast(<EditorClient />);

      expect(screen.getByText("Drafting Suite")).toBeInTheDocument();
    });

    it("renders New Story heading", () => {
      renderWithToast(<EditorClient />);

      expect(screen.getByText("New Story")).toBeInTheDocument();
    });

    it("renders Preview button", () => {
      renderWithToast(<EditorClient />);

      expect(screen.getByText("Preview")).toBeInTheDocument();
    });

    it("renders Publishing options button", () => {
      renderWithToast(<EditorClient />);

      expect(screen.getByText("Publishing options")).toBeInTheDocument();
    });
  });

  describe("Title and textarea inputs", () => {
    it("renders title input with correct placeholder", () => {
      renderWithToast(<EditorClient />);

      const titleInput = screen.getByPlaceholderText(
        "Enter a captivating title..."
      );
      expect(titleInput).toBeInTheDocument();
      expect(titleInput).toHaveAttribute("type", "text");
    });

    it("renders textarea with correct placeholder", () => {
      renderWithToast(<EditorClient />);

      const textarea = screen.getByPlaceholderText("Begin your narrative...");
      expect(textarea).toBeInTheDocument();
    });

    it("updates title when typing", () => {
      renderWithToast(<EditorClient />);

      const titleInput = screen.getByPlaceholderText(
        "Enter a captivating title..."
      );
      fireEvent.change(titleInput, { target: { value: "My Great Story" } });

      expect(titleInput).toHaveValue("My Great Story");
    });

    it("updates body when typing", () => {
      renderWithToast(<EditorClient />);

      const textarea = screen.getByPlaceholderText("Begin your narrative...");
      fireEvent.change(textarea, { target: { value: "Once upon a time..." } });

      expect(textarea).toHaveValue("Once upon a time...");
    });
  });

  describe("Toolbar buttons", () => {
    it("renders toolbar with Bold button", () => {
      renderWithToast(<EditorClient />);

      expect(screen.getByTitle("Bold")).toBeInTheDocument();
    });

    it("renders toolbar with Italic button", () => {
      renderWithToast(<EditorClient />);

      expect(screen.getByTitle("Italic")).toBeInTheDocument();
    });

    it("renders toolbar with List button", () => {
      renderWithToast(<EditorClient />);

      expect(screen.getByTitle("List")).toBeInTheDocument();
    });

    it("renders toolbar with Image button", () => {
      renderWithToast(<EditorClient />);

      expect(screen.getByTitle("Image")).toBeInTheDocument();
    });

    it("renders toolbar with Link button", () => {
      renderWithToast(<EditorClient />);

      expect(screen.getByTitle("Link")).toBeInTheDocument();
    });

    it("renders toolbar with Code button", () => {
      renderWithToast(<EditorClient />);

      expect(screen.getByTitle("Code")).toBeInTheDocument();
    });

    it("renders Markdown guide link", () => {
      renderWithToast(<EditorClient />);

      const markdownGuide = screen.getByText("Markdown guide");
      expect(markdownGuide).toBeInTheDocument();
      expect(markdownGuide).toHaveAttribute(
        "href",
        "https://www.markdownguide.org/cheat-sheet/"
      );
      expect(markdownGuide).toHaveAttribute("target", "_blank");
    });
  });

  describe("Post Settings sidebar", () => {
    it("renders URL Slug input when slug editor is toggled open", () => {
      renderWithToast(<EditorClient />);

      const slugToggle = screen.getByText("auto-generated");
      fireEvent.click(slugToggle);

      const slugInput = screen.getByPlaceholderText("my-post-slug");
      expect(slugInput).toBeInTheDocument();
    });

    it("renders Topic Tags section", () => {
      renderWithToast(<EditorClient />);

      expect(screen.getByText("Topic Tags")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Add tag...")).toBeInTheDocument();
    });

    it("renders Visibility select", () => {
      renderWithToast(<EditorClient />);

      const select = screen.getByDisplayValue("Public");
      expect(select).toBeInTheDocument();
    });

    it("renders SEO Description textarea", () => {
      renderWithToast(<EditorClient />);

      const seoTextarea = screen.getByPlaceholderText(
        "Brief description for search engines..."
      );
      expect(seoTextarea).toBeInTheDocument();
    });

    it("shows word count", () => {
      renderWithToast(<EditorClient />);

      expect(screen.getByText("0 Words")).toBeInTheDocument();
    });

    it("can add tags", () => {
      renderWithToast(<EditorClient />);

      const tagInput = screen.getByPlaceholderText("Add tag...");
      fireEvent.change(tagInput, { target: { value: "react" } });
      fireEvent.click(screen.getByText("add_circle").closest("button")!);

      expect(screen.getByText("react")).toBeInTheDocument();
    });

    it("can remove tags", () => {
      renderWithToast(<EditorClient />);

      const tagInput = screen.getByPlaceholderText("Add tag...");
      fireEvent.change(tagInput, { target: { value: "react" } });
      fireEvent.click(screen.getByText("add_circle").closest("button")!);

      expect(screen.getByText("react")).toBeInTheDocument();

      const removeButtons = screen.getAllByText("close");
      fireEvent.click(removeButtons[0]);

      expect(screen.queryByText("react")).not.toBeInTheDocument();
    });
  });

  describe("Preview and Publishing", () => {
    it("toggle shows preview mode", () => {
      renderWithToast(<EditorClient />);

      const previewButton = screen.getByText("Preview");
      fireEvent.click(previewButton);

      expect(screen.getByText("Edit")).toBeInTheDocument();
      expect(screen.getByText("Untitled Story")).toBeInTheDocument();
    });

    it("publishing options dropdown appears when clicked", () => {
      renderWithToast(<EditorClient />);

      const publishButton = screen.getByText("Publishing options");
      fireEvent.click(publishButton);

      expect(screen.getByText("Save as Draft")).toBeInTheDocument();
      expect(screen.getByText("Publish Now")).toBeInTheDocument();
      expect(screen.getByText("Schedule for Later")).toBeInTheDocument();
    });
  });
});
