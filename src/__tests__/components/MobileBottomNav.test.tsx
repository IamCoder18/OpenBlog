import { render, screen, fireEvent } from "@testing-library/react";
import MobileBottomNav from "../../components/MobileBottomNav";

let consoleSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  document.body.style.overflow = "";
  consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  consoleSpy.mockRestore();
});

describe("MobileBottomNav", () => {
  describe("Renders tabs", () => {
    it("renders Feed and Explore for all users", () => {
      render(<MobileBottomNav />);

      expect(screen.getByText("Feed")).toBeInTheDocument();
      expect(screen.getByText("Explore")).toBeInTheDocument();
    });

    it("renders More tab for admin", () => {
      render(<MobileBottomNav isAdmin={true} />);

      expect(screen.getByText("More")).toBeInTheDocument();
    });

    it("does not render More tab for non-admin", () => {
      render(<MobileBottomNav isAdmin={false} />);

      expect(screen.queryByText("More")).not.toBeInTheDocument();
    });
  });

  describe("Tab icons", () => {
    it("Feed tab has home icon", () => {
      render(<MobileBottomNav />);

      const feedLink = screen.getByText("Feed").closest("a");
      const icon = feedLink?.querySelector(".material-symbols-outlined");
      expect(icon).toHaveTextContent("home");
    });

    it("Explore tab has explore icon", () => {
      render(<MobileBottomNav />);

      const exploreLink = screen.getByText("Explore").closest("a");
      const icon = exploreLink?.querySelector(".material-symbols-outlined");
      expect(icon).toHaveTextContent("explore");
    });

    it("More button has menu icon", () => {
      render(<MobileBottomNav isAdmin={true} />);

      const moreBtn = screen.getByLabelText("Open menu");
      const icon = moreBtn.querySelector(".material-symbols-outlined");
      expect(icon).toHaveTextContent("menu");
    });
  });

  describe("Tab links", () => {
    it("Feed tab links to /", () => {
      render(<MobileBottomNav />);

      const feedLink = screen.getByText("Feed").closest("a");
      expect(feedLink).toHaveAttribute("href", "/");
    });

    it("Explore tab links to /explore", () => {
      render(<MobileBottomNav />);

      const exploreLink = screen.getByText("Explore").closest("a");
      expect(exploreLink).toHaveAttribute("href", "/explore");
    });
  });

  describe("Active tab styling", () => {
    it("active feed tab has text-primary class", () => {
      render(<MobileBottomNav activeTab="feed" />);

      const feedLink = screen.getByText("Feed").closest("a");
      expect(feedLink).toHaveClass("text-primary");
    });

    it("inactive explore tab has text-on-surface-variant when feed is active", () => {
      render(<MobileBottomNav activeTab="feed" />);

      const exploreLink = screen.getByText("Explore").closest("a");
      expect(exploreLink).toHaveClass("text-on-surface-variant");
    });

    it("active explore tab has text-primary class", () => {
      render(<MobileBottomNav activeTab="explore" />);

      const exploreLink = screen.getByText("Explore").closest("a");
      expect(exploreLink).toHaveClass("text-primary");
    });

    it("inactive feed tab has text-on-surface-variant when explore is active", () => {
      render(<MobileBottomNav activeTab="explore" />);

      const feedLink = screen.getByText("Feed").closest("a");
      expect(feedLink).toHaveClass("text-on-surface-variant");
    });
  });

  describe("Layout classes", () => {
    it("has bg-surface/70 and backdrop-blur-xl for glassmorphism", () => {
      render(<MobileBottomNav />);

      const nav = document.querySelector("nav");
      expect(nav).toHaveClass("bg-surface/70");
      expect(nav).toHaveClass("backdrop-blur-xl");
    });

    it("is hidden on desktop with md:hidden class", () => {
      render(<MobileBottomNav />);

      const nav = document.querySelector("nav");
      expect(nav).toHaveClass("md:hidden");
    });
  });

  describe("Admin drawer", () => {
    it("drawer is hidden by default", () => {
      render(<MobileBottomNav isAdmin={true} />);

      const drawer = document.querySelector(".translate-y-full");
      expect(drawer).toBeInTheDocument();
    });

    it("opens drawer when More button is clicked", () => {
      render(<MobileBottomNav isAdmin={true} />);

      const moreBtn = screen.getByLabelText("Open menu");
      fireEvent.click(moreBtn);

      const closeBtn = screen.getByLabelText("Close menu");
      expect(closeBtn).toBeInTheDocument();
    });

    it("sets body overflow to hidden when drawer opens", () => {
      render(<MobileBottomNav isAdmin={true} />);

      const moreBtn = screen.getByLabelText("Open menu");
      fireEvent.click(moreBtn);

      expect(document.body.style.overflow).toBe("hidden");
    });

    it("shows Menu header when drawer is open", () => {
      render(<MobileBottomNav isAdmin={true} />);

      const moreBtn = screen.getByLabelText("Open menu");
      fireEvent.click(moreBtn);

      expect(screen.getByText("Menu")).toBeInTheDocument();
    });

    it("shows Dashboard link", () => {
      render(<MobileBottomNav isAdmin={true} />);

      const moreBtn = screen.getByLabelText("Open menu");
      fireEvent.click(moreBtn);

      const dashboardLink = screen.getByText("Dashboard");
      expect(dashboardLink).toBeInTheDocument();
      expect(dashboardLink).toHaveAttribute("href", "/dashboard");
    });

    it("shows Logout button", () => {
      render(<MobileBottomNav isAdmin={true} />);

      const moreBtn = screen.getByLabelText("Open menu");
      fireEvent.click(moreBtn);

      expect(screen.getByText("Logout")).toBeInTheDocument();
    });

    it("closes drawer when close button is clicked", () => {
      render(<MobileBottomNav isAdmin={true} />);

      const moreBtn = screen.getByLabelText("Open menu");
      fireEvent.click(moreBtn);

      const closeBtn = screen.getByLabelText("Close menu");
      fireEvent.click(closeBtn);

      expect(document.body.style.overflow).toBe("");
    });

    it("closes drawer when backdrop is clicked", () => {
      render(<MobileBottomNav isAdmin={true} />);

      const moreBtn = screen.getByLabelText("Open menu");
      fireEvent.click(moreBtn);

      const backdrop = document.querySelector(".backdrop-blur-sm");
      if (backdrop) {
        fireEvent.click(backdrop);
      }

      expect(document.body.style.overflow).toBe("");
    });
  });

  describe("Body overflow cleanup", () => {
    it("cleans up body overflow on unmount", () => {
      const { unmount } = render(<MobileBottomNav isAdmin={true} />);

      const moreBtn = screen.getByLabelText("Open menu");
      fireEvent.click(moreBtn);

      expect(document.body.style.overflow).toBe("hidden");

      unmount();

      expect(document.body.style.overflow).toBe("");
    });
  });
});
