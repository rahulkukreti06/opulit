export default function DashboardFooter() {
  return <footer className="dashboard-footer">
    <span>© {new Date().getFullYear()} Opulit</span>
    <nav aria-label="Footer">
      <a href="/">Opulit home</a>
      <a href="/terms">Terms of Service</a>
      <a href="/privacy">Privacy Policy</a>
    </nav>
  </footer>
}
