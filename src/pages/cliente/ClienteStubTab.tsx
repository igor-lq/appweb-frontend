import { useOutletContext } from "react-router-dom";
import type { Cliente } from "../../mocks/clientes";
import { StubPage } from "../StubPage";

interface ClienteContext {
  cliente?: Cliente;
}

export function ClienteStubTab({ titulo }: { titulo: string }) {
  const { cliente } = useOutletContext<ClienteContext>();
  return <StubPage kicker={cliente?.nome ?? "Cliente"} titulo={titulo} />;
}
