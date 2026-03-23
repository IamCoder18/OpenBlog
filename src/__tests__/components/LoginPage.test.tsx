import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "../mocks/browser";
import { handlers } from "../mocks/handlers";
import LoginClient from "../../app/auth/login/LoginClient";

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

describe("LoginPage", () => {
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
      render(<LoginClient signUpEnabled={true} />);
      const logo = screen.getByText("OpenBlog");
      expect(logo).toBeInTheDocument();
      expect(logo).toHaveAttribute("href", "/");
    });

    it("renders welcome text", () => {
      render(<LoginClient signUpEnabled={true} />);
      expect(
        screen.getByText("Welcome back. Sign in to your editorial suite.")
      ).toBeInTheDocument();
    });

    it("renders email input field", () => {
      render(<LoginClient signUpEnabled={true} />);
      const emailInput = screen.getByPlaceholderText("you@example.com");
      expect(emailInput).toBeInTheDocument();
      expect(emailInput).toHaveAttribute("type", "email");
    });

    it("renders password input field", () => {
      render(<LoginClient signUpEnabled={true} />);
      const passwordInput = screen.getByPlaceholderText("Enter your password");
      expect(passwordInput).toBeInTheDocument();
      expect(passwordInput).toHaveAttribute("type", "password");
    });

    it("renders Sign In button", () => {
      render(<LoginClient signUpEnabled={true} />);
      expect(screen.getByText("Sign In")).toBeInTheDocument();
    });

    it('renders "Create one" link to /auth/signup', () => {
      render(<LoginClient signUpEnabled={true} />);
      const createLink = screen.getByText("Create one");
      expect(createLink).toBeInTheDocument();
      expect(createLink).toHaveAttribute("href", "/auth/signup");
    });

    it("renders Back to blog link to /", () => {
      render(<LoginClient signUpEnabled={true} />);
      const backLink = screen.getByText("Back to blog");
      expect(backLink).toBeInTheDocument();
      expect(backLink).toHaveAttribute("href", "/");
    });
  });

  describe("Input interaction", () => {
    it("updates email value on input", () => {
      render(<LoginClient signUpEnabled={true} />);
      const emailInput = screen.getByPlaceholderText("you@example.com");
      fireEvent.change(emailInput, { target: { value: "test@example.com" } });
      expect(emailInput).toHaveValue("test@example.com");
    });

    it("updates password value on input", () => {
      render(<LoginClient signUpEnabled={true} />);
      const passwordInput = screen.getByPlaceholderText("Enter your password");
      fireEvent.change(passwordInput, { target: { value: "secret123" } });
      expect(passwordInput).toHaveValue("secret123");
    });
  });

  describe("Submission", () => {
    it("shows loading spinner during submission", async () => {
      server.use(
        http.post("/api/auth/sign-in/email", async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
          return HttpResponse.json({ success: true });
        })
      );

      render(<LoginClient signUpEnabled={true} />);
      fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
        target: { value: "test@example.com" },
      });
      fireEvent.change(screen.getByPlaceholderText("Enter your password"), {
        target: { value: "secret123" },
      });
      fireEvent.submit(screen.getByText("Sign In").closest("form")!);

      expect(screen.getByText("sync")).toBeInTheDocument();
    });

    it("calls router.push('/dashboard') on successful login", async () => {
      server.use(
        http.post("/api/auth/sign-in/email", () => {
          return HttpResponse.json({ success: true });
        })
      );

      render(<LoginClient signUpEnabled={true} />);
      fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
        target: { value: "test@example.com" },
      });
      fireEvent.change(screen.getByPlaceholderText("Enter your password"), {
        target: { value: "secret123" },
      });
      fireEvent.submit(screen.getByText("Sign In").closest("form")!);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/dashboard");
      });
    });

    it("calls router.refresh() on successful login", async () => {
      server.use(
        http.post("/api/auth/sign-in/email", () => {
          return HttpResponse.json({ success: true });
        })
      );

      render(<LoginClient signUpEnabled={true} />);
      fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
        target: { value: "test@example.com" },
      });
      fireEvent.change(screen.getByPlaceholderText("Enter your password"), {
        target: { value: "secret123" },
      });
      fireEvent.submit(screen.getByText("Sign In").closest("form")!);

      await waitFor(() => {
        expect(mockRefresh).toHaveBeenCalled();
      });
    });

    it("shows error message on failed login", async () => {
      server.use(
        http.post("/api/auth/sign-in/email", () => {
          return HttpResponse.json(
            { message: "Invalid credentials" },
            { status: 401 }
          );
        })
      );

      render(<LoginClient signUpEnabled={true} />);
      fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
        target: { value: "test@example.com" },
      });
      fireEvent.change(screen.getByPlaceholderText("Enter your password"), {
        target: { value: "wrong" },
      });
      fireEvent.submit(screen.getByText("Sign In").closest("form")!);

      await waitFor(() => {
        expect(screen.getByText("Invalid credentials")).toBeInTheDocument();
      });
    });

    it("does not call router.push on failed login", async () => {
      server.use(
        http.post("/api/auth/sign-in/email", () => {
          return HttpResponse.json(
            { message: "Invalid credentials" },
            { status: 401 }
          );
        })
      );

      render(<LoginClient signUpEnabled={true} />);
      fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
        target: { value: "test@example.com" },
      });
      fireEvent.change(screen.getByPlaceholderText("Enter your password"), {
        target: { value: "wrong" },
      });
      fireEvent.submit(screen.getByText("Sign In").closest("form")!);

      await waitFor(() => {
        expect(screen.getByText("Invalid credentials")).toBeInTheDocument();
      });
      expect(mockPush).not.toHaveBeenCalled();
    });

    it("sends correct body in POST request", async () => {
      let capturedBody: any;
      server.use(
        http.post("/api/auth/sign-in/email", async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json({ success: true });
        })
      );

      render(<LoginClient signUpEnabled={true} />);
      fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
        target: { value: "user@example.com" },
      });
      fireEvent.change(screen.getByPlaceholderText("Enter your password"), {
        target: { value: "mypassword" },
      });
      fireEvent.submit(screen.getByText("Sign In").closest("form")!);

      await waitFor(() => {
        expect(capturedBody).toEqual({
          email: "user@example.com",
          password: "mypassword",
        });
      });
    });
  });
});
