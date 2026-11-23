import React from "react";
import { backend } from "./backend";

export default class PanelBoundary extends React.Component {
  state = { failed: false, retry: 0, logoutError: "" };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error) {
    // El detalle se conserva en la consola local, sin incluir datos del perfil.
    console.error("No se pudo mostrar el panel:", error?.message);
  }
  async logout() {
    try {
      const { error } = await backend.auth.signOut({ scope: "local" });
      if (error) throw error;
      location.hash = "/ingresar";
      this.setState({ failed: false, logoutError: "" });
    } catch {
      this.setState({ logoutError: "No pudimos cerrar la sesión. Volvé a intentar." });
    }
  }
  render() {
    if (this.state.failed) return (
      <section className="section wrap panel-failure" role="alert">
        <p className="eyebrow">Tu cuenta</p>
        <h1 className="page-title">Recuperemos <em>tu espacio.</em></h1>
        <p>No pudimos mostrar el panel. Podés volver a intentarlo o seguir recorriendo la galería.</p>
        <div className="account-actions">
          <button className="button" onClick={() => this.setState(state => ({ failed: false, retry: state.retry + 1 }))}>Volver a intentar</button>
          <a className="small-button" href="#/galeria">Ir a la galería</a>
          {backend && <button className="text-button" onClick={() => this.logout()}>Cerrar sesión</button>}
        </div>
        {this.state.logoutError && <p>{this.state.logoutError}</p>}
      </section>
    );
    return <React.Fragment key={this.state.retry}>{this.props.children}</React.Fragment>;
  }
}
