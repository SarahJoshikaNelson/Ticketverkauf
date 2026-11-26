import { useState, useEffect } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HomeIcon, PlusIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { usePhase } from "@/context/PhaseContext";
import { PHASES_OBJECT } from "../settings/phases/CurrentPhase";

const items = [
  {
    title: "Statistiken",
    description: undefined,
    url: "/",
    icon: HomeIcon,
  },
];

function Nav() {
  const { phase, hasOrders } = usePhase();
  const [tooltipSide, setTooltipSide] = useState<"right" | "bottom">(
    window.innerWidth <= 516 ? "bottom" : "right"
  );

  useEffect(() => {
    const handleResize = () => {
      setTooltipSide(window.innerWidth <= 516 ? "bottom" : "right");
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const sections = [
    {
      key: "designs",
      title: "Designs",
      description: "Erscheinungsbild der Website und Tickets anpassen",
      items: [
        {
          label: "Allgemeines Design",
          description: `Farben, anderes Styling${phase !== 0 ? " (nur in Phase 0 verfügbar)" : ""
            }`,
          to: phase === 0 ? "/settings/styling" : undefined,
          isExternal: false,
        },
        {
          label: "Karten",
          description: phase !== 0 ? "Nur in Phase 0 verfügbar" : undefined,
          to: phase === 0 ? "/designs/tickets" : undefined,
          isExternal: false,
        },
      ],
    },
    {
      key: "orders",
      title: "Bestellungen",
      description: "Bestellungen und Sitzplätze verwalten",
      items: [
        {
          label: "Übersicht",
          description: undefined,
          to: "/orders/overview",
          isExternal: false,
        },
        {
          label: "Status der Sitze",
          description: `Belegung, Anordnung`,
          to: "/orders/seats-status",
          isExternal: false,
        },
        {
          label: "Kontoauszug",
          description:
            "Zum Einlesen eines Kontoauszuges und somit die Zahlungseingänge zu überprüfen. Stellt bei den erkannten Tickets den Status auf bezahlt.",
          to: "/settings/bank",
          isExternal: false,
        },
        {
          label: "E-Mail-Versand",
          description:
            "Senden Sie Massen-E-Mails an Kunden basierend auf ihrem Bestellstatus",
          to: "/mail-sender",
          isExternal: false,
        },
        {
          label: "Shop-Produkte",
          description: "Verwalten Sie Produkte und sehen Sie Verkaufsstatistiken",
          to: "/settings/shop",
          isExternal: false,
        },
      ],
    },
    {
      key: "settings",
      title: "Einstellungen",
      description: undefined,
      items: [
        // Wartesystem appears first when sales are active (phase >= 1)
        ...(phase !== null && phase >= 1
          ? [
            {
              label: "Wartesystem",
              description:
                "Die Warteschlange ist für den Fall, dass viele User gleichzeitig Tickets bestellen wollen.",
              to: "/settings/queue",
              isExternal: false,
            },
          ]
          : []),
        {
          label: "Karten",
          description: `Preise und mehr${phase !== 0 ? " (nur in Phase 0 verfügbar)" : ""
            }`,
          to: phase === 0 || phase === null ? "/settings/tickets" : undefined,
          isExternal: false,
        },
        {
          label: "Sitz Konfigurator",
          description: `Zum genauen Einrichten der Sitzplätze/Tische${phase !== 0 ? " (nur in Phase 0 verfügbar)" : ""
            }`,
          to: phase === 0 || phase === null ? "/settings/tables" : undefined,
          isExternal: false,
        },
        {
          label: "Allgemeine Daten",
          description: `Event-Informationen, Zahlungsdaten und Organisationsdaten${phase !== 0 ? " (nur in Phase 0 bearbeitbar)" : ""
            }`,
          to: "/settings/data",
          isExternal: false,
        },
        {
          label: "Zeitplan",
          description: "Ablauf des Events",
          to: phase === 0 || phase === null ? "/settings/schedule" : undefined,
          isExternal: false,
        },
        // Wartesystem in normal position when not in sales phase
        ...(phase === null || phase === 0
          ? [
            {
              label: "Wartesystem",
              description:
                "Die Warteschlange ist für den Fall, dass viele User gleichzeitig Tickets bestellen wollen.",
              to: "/settings/queue",
              isExternal: false,
            },
          ]
          : []),
        {
          label: "Phasen",
          description:
            "Steuert welche Funktionen für Admins und Nutzer verfügbar sind",
          to: "/settings/phases",
          isExternal: false,
        },
        {
          label: "Admins",
          description: "Definieren aller Administratoren des Systems",
          to: "/settings/admin",
          isExternal: false,
        },
        {
          label: "Maturantenliste",
          description: "Verwaltung der Maturanten - CSV hochladen und Liste anzeigen",
          to: "/settings/students",
          isExternal: false,
        },
        {
          label: "KI-Einstellungen",
          description: "Z. B. OpenRouter API Token",
          to: "/settings/ai",
          isExternal: false,
        },
        {
          label: "Stripe-Zahlung",
          description: `Online-Zahlung via Stripe aktivieren/deaktivieren${phase !== 0 ? " (nur in Phase 0 verfügbar)" : ""
            }`,
          to: phase === 0 || phase === null ? "/settings/stripe" : undefined,
          isExternal: false,
        },
        {
          label: "Mail-Server",
          description: "Konfiguration des SMTP E-Mail-Servers für den Ticket- und Rechnungsversand",
          to: "/settings/mail-server",
          isExternal: false,
        },
        {
          label: "Backup & Reset",
          description:
            "Daten exportieren, importieren oder für ein neues Jahr zurücksetzen",
          to: "/settings/backup",
          isExternal: false,
        },
      ],
    },
    {
      key: "in-person",
      title: "Vor Ort",
      description: undefined,
      items: [
        {
          label: "Scanner",
          description:
            "QR-Code-Scanner-Seite für Ticket-Überprüfung beim Einlass",
          to: import.meta.env.VITE_API_Q_SCAN_URL,
          isExternal: true,
        },
      ],
    },
  ] satisfies {
    key: string;
    title: string;
    description: string | undefined;
    items: {
      label: string;
      description: string | undefined;
      to?: string;
      isExternal: boolean;
    }[];
  }[];

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Dashboard</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuSubItem className="my-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <SidebarMenuButton asChild>
                      <Link to="/settings/phases">
                        <div className="flex items-center justify-between w-full">
                          <p className="text-accent-800">
                            Aktuelle Phase:{" "}
                            {phase === null ? (
                              <>&ndash;</>
                            ) : (
                              <>
                                <br />
                                {PHASES_OBJECT[phase]}
                              </>
                            )}
                          </p>
                        </div>
                      </Link>
                    </SidebarMenuButton>
                  </TooltipTrigger>
                  <TooltipContent
                    side={tooltipSide}
                    align={tooltipSide === "bottom" ? "start" : undefined}
                    className="max-w-[min(16rem,50vw)]"
                  >
                    <p>
                      Steuert welche Funktionen für Admins und Nutzer verfügbar
                      sind
                    </p>
                  </TooltipContent>
                </Tooltip>
              </SidebarMenuSubItem>

              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <SidebarMenuButton asChild>
                        <Link to={item.url}>
                          <p className="text-accent-800">
                            {item.icon && (
                              <item.icon className="w-4 h-4 mr-2" />
                            )}
                          </p>
                          <p className="text-accent-800">{item.title}</p>
                        </Link>
                      </SidebarMenuButton>
                    </TooltipTrigger>
                    <TooltipContent
                      side={tooltipSide}
                      align={tooltipSide === "bottom" ? "start" : undefined}
                      className="max-w-[min(16rem,50vw)]"
                    >
                      <p>{item.description}</p>
                    </TooltipContent>
                  </Tooltip>
                </SidebarMenuItem>
              ))}

              {/* Render menu sections from the data model */}
              {sections.map((sec) => {
                const hasEnabled = sec.items.some((i) => !!i.to);
                return (
                  <Collapsible
                    key={sec.key}
                    defaultOpen={hasEnabled}
                    className="group/collapsible"
                  >
                    <SidebarMenuItem>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <CollapsibleTrigger asChild>
                            <SidebarMenuButton>
                              <PlusIcon className="w-4 h-4 mr-2 -ml-[0.65rem]" />
                              <p>{sec.title}</p>
                            </SidebarMenuButton>
                          </CollapsibleTrigger>
                        </TooltipTrigger>
                        <TooltipContent
                          side={tooltipSide}
                          align={tooltipSide === "bottom" ? "start" : undefined}
                          className="max-w-[min(16rem,50vw)]"
                        >
                          <p>{sec.description}</p>
                        </TooltipContent>
                      </Tooltip>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {sec.items.map((mi) => (
                            <SidebarMenuSubItem key={`${sec.key}-${mi.label}`}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <SidebarMenuButton asChild>
                                    {mi.to ? (
                                      mi.isExternal ? (
                                        <a
                                          href={mi.to}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                        >
                                          <p className="text-accent-800 flex items-center gap-1">
                                            {mi.label}
                                            <svg
                                              className="w-3 h-3"
                                              xmlns="http://www.w3.org/2000/svg"
                                              viewBox="0 0 24 24"
                                              fill="none"
                                              stroke="currentColor"
                                              strokeWidth="2"
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                            >
                                              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                              <polyline points="15 3 21 3 21 9" />
                                              <line
                                                x1="10"
                                                y1="14"
                                                x2="21"
                                                y2="3"
                                              />
                                            </svg>
                                          </p>
                                        </a>
                                      ) : (
                                        <Link to={mi.to}>
                                          <p className="text-accent-800">
                                            {mi.label}
                                          </p>
                                        </Link>
                                      )
                                    ) : (
                                      <div>
                                        <p className="text-gray-400">
                                          {mi.label}
                                        </p>
                                      </div>
                                    )}
                                  </SidebarMenuButton>
                                </TooltipTrigger>
                                <TooltipContent
                                  side={tooltipSide}
                                  align={
                                    tooltipSide === "bottom"
                                      ? "start"
                                      : undefined
                                  }
                                  className="max-w-[min(16rem,50vw)]"
                                >
                                  <p>{mi.description}</p>
                                </TooltipContent>
                              </Tooltip>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

export default Nav;
