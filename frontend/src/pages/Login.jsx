import { IconBrandGithub, IconShieldCheck } from "@tabler/icons-react";
import { useAuth } from "../context/AuthContext.jsx";

const Login = () => {
  const { login } = useAuth();

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left: brand + sign-in */}
      <div className="flex-1 flex flex-col justify-center px-8 md:px-16 py-16">
        <div className="max-w-md">
          <div className="flex items-center gap-2 mb-10">
            <IconShieldCheck size={28} className="text-sentinel" stroke={1.75} />
            <span className="font-mono text-lg text-parchment tracking-tight">CodeSentinel</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-sans font-semibold text-parchment leading-tight mb-5">
            Know your repo's health before your reviewers do.
          </h1>

          <p className="text-muted text-lg leading-relaxed mb-10">
            Connect a repository and CodeSentinel scans every push: static
            analysis, dependency vulnerabilities, and an AI review pass,
            turned into one health score you can actually act on.
          </p>

          <button
            onClick={login}
            className="inline-flex items-center gap-3 bg-parchment text-ink font-medium px-6 py-3.5 rounded-md hover:bg-white transition-colors"
          >
            <IconBrandGithub size={22} stroke={1.75} />
            Sign in with GitHub
          </button>

          <p className="text-muted text-sm mt-5">
            We request repo and webhook access to scan pushes automatically.
            You can disconnect any repository at any time.
          </p>
        </div>
      </div>

      {/* Right: stylized scan-output panel - the hero moment, grounded
          in what the product actually produces rather than a stock
          illustration. */}
      <div className="flex-1 bg-surface border-t md:border-t-0 md:border-l border-line flex items-center justify-center px-8 py-16">
        <div className="w-full max-w-sm font-mono text-sm">
          <div className="flex items-baseline justify-between mb-6">
            <span className="text-muted">health score</span>
            <span className="text-5xl font-semibold text-medium">76</span>
          </div>

          <div className="h-px bg-line mb-6" />

          <ScanLine label="security" count={2} color="text-critical" dotColor="bg-critical" />
          <ScanLine label="correctness" count={5} color="text-high" dotColor="bg-high" />
          <ScanLine label="maintainability" count={11} color="text-muted" dotColor="bg-line" />

          <div className="h-px bg-line my-6" />

          <div className="text-muted leading-relaxed">
            <span className="text-parchment">auth-middleware.js:34</span>
            <br />
            missing authorization check on admin route
          </div>
        </div>
      </div>
    </div>
  );
};

const ScanLine = ({ label, count, color, dotColor }) => (
  <div className="flex items-center justify-between py-2">
    <div className="flex items-center gap-2.5">
      <span className={`w-2 h-2 rounded-full ${dotColor}`} />
      <span className="text-parchment">{label}</span>
    </div>
    <span className={color}>{count} issues</span>
  </div>
);

export default Login;
