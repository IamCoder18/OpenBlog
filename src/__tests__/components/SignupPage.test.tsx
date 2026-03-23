import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "../mocks/browser";
import { handlers } from "../mocks/handlers";
import SignupClient from "../../app/auth/signup/SignupClient";

const mockPush = vi.fn();
const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

let server: ReturnType<typeof setupServer>;

beforeAll(async () => {
  server = await setupServer();
  server.use(...handlers);
  server.listen();
});

afterAll(() => {
  server.close();
});

describe("SignupPage", () => {
  let consoleErrorSpy: vi.SpyInstance;

  beforeEach(() => {
    mockPush.mockReset();
    mockRefresh.mockReset();
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(message => {
      if (
        typeof message === "string" &&
        message.includes("was not wrapped in act")
      ) {
        return;
      }
      console.log(message);
    });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    server.resetHandlers();
  });

  describe("Rendering", () => {
    it("renders OpenBlog logo linking to /", () => {
      render(<SignupClient />);
      const logo = screen.getByText("OpenBlog");
      expect(logo).toBeInTheDocument();
      expect(logo).toHaveAttribute("href", "/");
    });

    it('renders "Create your account" text', () => {
      render(<SignupClient />);
      expect(
        screen.getByText("Create your account. Join the editorial collective.")
      ).toBeInTheDocument();
    });

    it("renders Full Name input", () => {
      render(<SignupClient />);
      const nameInput = screen.getByPlaceholderText("Your name");
      expect(nameInput).toBeInTheDocument();
      expect(nameInput).toHaveAttribute("type", "text");
    });

    it("renders Email input", () => {
      render(<SignupClient />);
      const emailInput = screen.getByPlaceholderText("you@example.com");
      expect(emailInput).toBeInTheDocument();
      expect(emailInput).toHaveAttribute("type", "email");
    });

    it("renders Password input", () => {
      render(<SignupClient />);
      const passwordInput = screen.getByPlaceholderText(
        "At least 6 characters"
      );
      expect(passwordInput).toBeInTheDocument();
      expect(passwordInput).toHaveAttribute("type", "password");
    });

    it("renders Confirm Password input", () => {
      render(<SignupClient />);
      const confirmInput = screen.getByPlaceholderText(
        "Re-enter your password"
      );
      expect(confirmInput).toBeInTheDocument();
      expect(confirmInput).toHaveAttribute("type", "password");
    });

    it("renders Create Account button", () => {
      render(<SignupClient />);
      expect(screen.getByText("Create Account")).toBeInTheDocument();
    });

    it('renders "Sign in" link to /auth/login', () => {
      render(<SignupClient />);
      const signInLink = screen.getByText("Sign in");
      expect(signInLink).toBeInTheDocument();
      expect(signInLink).toHaveAttribute("href", "/auth/login");
    });

    it("renders Back to blog link to /", () => {
      render(<SignupClient />);
      const backLink = screen.getByText("Back to blog");
      expect(backLink).toBeInTheDocument();
      expect(backLink).toHaveAttribute("href", "/");
    });
  });

  describe("Input interaction", () => {
    it("updates all input values on change", () => {
      render(<SignupClient />);

      const nameInput = screen.getByPlaceholderText("Your name");
      const emailInput = screen.getByPlaceholderText("you@example.com");
      const passwordInput = screen.getByPlaceholderText(
        "At least 6 characters"
      );
      const confirmInput = screen.getByPlaceholderText(
        "Re-enter your password"
      );

      fireEvent.change(nameInput, { target: { value: "John Doe" } });
      fireEvent.change(emailInput, { target: { value: "john@example.com" } });
      fireEvent.change(passwordInput, { target: { value: "secret123" } });
      fireEvent.change(confirmInput, { target: { value: "secret123" } });

      expect(nameInput).toHaveValue("John Doe");
      expect(emailInput).toHaveValue("john@example.com");
      expect(passwordInput).toHaveValue("secret123");
      expect(confirmInput).toHaveValue("secret123");
    });
  });

  describe("Validation", () => {
    it("shows error when passwords don't match", () => {
      render(<SignupClient />);
      fireEvent.change(screen.getByPlaceholderText("Your name"), {
        target: { value: "John Doe" },
      });
      fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
        target: { value: "john@example.com" },
      });
      fireEvent.change(screen.getByPlaceholderText("At least 6 characters"), {
        target: { value: "secret123" },
      });
      fireEvent.change(screen.getByPlaceholderText("Re-enter your password"), {
        target: { value: "different" },
      });
      fireEvent.submit(screen.getByText("Create Account").closest("form")!);

      expect(screen.getByText("Passwords do not match.")).toBeInTheDocument();
    });

    it("shows error when password is too short", () => {
      render(<SignupClient />);
      fireEvent.change(screen.getByPlaceholderText("Your name"), {
        target: { value: "John Doe" },
      });
      fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
        target: { value: "john@example.com" },
      });
      fireEvent.change(screen.getByPlaceholderText("At least 6 characters"), {
        target: { value: "abc" },
      });
      fireEvent.change(screen.getByPlaceholderText("Re-enter your password"), {
        target: { value: "abc" },
      });
      fireEvent.submit(screen.getByText("Create Account").closest("form")!);

      expect(
        screen.getByText("Password must be at least 6 characters.")
      ).toBeInTheDocument();
    });
  });

  describe("Submission", () => {
    it("shows loading spinner during submission", async () => {
      server.use(
        http.post("/api/auth/sign-up/email", async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
          return HttpResponse.json({ success: true });
        })
      );

      render(<SignupClient />);
      fireEvent.change(screen.getByPlaceholderText("Your name"), {
        target: { value: "John Doe" },
      });
      fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
        target: { value: "john@example.com" },
      });
      fireEvent.change(screen.getByPlaceholderText("At least 6 characters"), {
        target: { value: "secret123" },
      });
      fireEvent.change(screen.getByPlaceholderText("Re-enter your password"), {
        target: { value: "secret123" },
      });
      fireEvent.submit(screen.getByText("Create Account").closest("form")!);

      expect(screen.getByText("sync")).toBeInTheDocument();
    });

    it("calls router.push('/dashboard') on successful signup", async () => {
      server.use(
        http.post("/api/auth/sign-up/email", () => {
          return HttpResponse.json({ success: true });
        })
      );

      render(<SignupClient />);
      fireEvent.change(screen.getByPlaceholderText("Your name"), {
        target: { value: "John Doe" },
      });
      fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
        target: { value: "john@example.com" },
      });
      fireEvent.change(screen.getByPlaceholderText("At least 6 characters"), {
        target: { value: "secret123" },
      });
      fireEvent.change(screen.getByPlaceholderText("Re-enter your password"), {
        target: { value: "secret123" },
      });
      fireEvent.submit(screen.getByText("Create Account").closest("form")!);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/agent/profile");
      });
    });

    it("shows error message on failed signup", async () => {
      server.use(
        http.post("/api/auth/sign-up/email", () => {
          return HttpResponse.json(
            { message: "Email already exists" },
            { status: 400 }
          );
        })
      );

      render(<SignupClient />);
      fireEvent.change(screen.getByPlaceholderText("Your name"), {
        target: { value: "John Doe" },
      });
      fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
        target: { value: "john@example.com" },
      });
      fireEvent.change(screen.getByPlaceholderText("At least 6 characters"), {
        target: { value: "secret123" },
      });
      fireEvent.change(screen.getByPlaceholderText("Re-enter your password"), {
        target: { value: "secret123" },
      });
      fireEvent.submit(screen.getByText("Create Account").closest("form")!);

      await waitFor(() => {
        expect(screen.getByText("Email already exists")).toBeInTheDocument();
      });
    });
  });
});
