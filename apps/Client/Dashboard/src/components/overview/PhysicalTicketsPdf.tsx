import {
  View,
  Document,
  PDFViewer,
  Text,
  Page,
  Image,
  Svg,
  ImageProps,
} from "@react-pdf/renderer";
import { PhysicalTicketResponseDto } from "./PrintDialog";
import QRCode from "qrcode";
import print from "print-js";
import { useEffect, useRef } from "react";

export default function PhysicalTicketPdfView({
  tickets,
  qrForeground,
  qrBackground,
  shouldPrint,
  setShouldPrint,
}: {
  tickets: PhysicalTicketResponseDto[];
  qrForeground: string;
  qrBackground: string;
  shouldPrint: boolean;
  setShouldPrint: (value: boolean) => void;
}) {
  return (
    <PDFViewer
      style={{ flex: 1, width: "100%", height: "100%" }}
      showToolbar={false}
      key={
        Math.random() /* This is so the PDF viewer is recreated every render, which solves some known rendering issues. */
      }
    >
      <Document
        onRender={({ blob }) => {
          if (!blob || !shouldPrint) {
            return;
          }

          print(URL.createObjectURL(blob));
          setShouldPrint(false);
        }}
      >
        <Page
          size={"A4"}
          style={{
            padding: "1cm",
          }}
        >
          <View
            style={{
              justifyContent: "space-between",
              flexDirection: "row",
              flexWrap: "wrap",
            }}
          >
            {tickets.map((ticket) => (
              <View key={ticket.ticketId}>
                <TicketQrCode
                  ticket={ticket}
                  qrForeground={qrForeground}
                  qrBackground={qrBackground}
                  style={{
                    width: "2.5cm",
                    height: "2.5cm",
                  }}
                />
                <Text style={{ fontSize: "0.5rem" }}>Besteller:</Text>
                <Text style={{ fontSize: "0.5rem" }}>{ticket.ownerName}</Text>
                <Text style={{ fontSize: "0.5rem" }}>Bestellung:</Text>
                <Text style={{ fontSize: "0.5rem" }}>{ticket.orderId}</Text>
              </View>
            ))}
          </View>
        </Page>
      </Document>
    </PDFViewer>
  );
}

function TicketQrCode(
  props: Omit<ImageProps, "src"> & {
    ticket: PhysicalTicketResponseDto;
    qrForeground: string;
    qrBackground: string;
  }
) {
  const codeBase64 = QRCode.toDataURL(props.ticket.ticketId, {
    color: {
      dark: props.qrForeground,
      light: props.qrBackground,
    },
    type: "image/jpeg",
  });
  return <Image src={codeBase64} {...props}></Image>;
}
