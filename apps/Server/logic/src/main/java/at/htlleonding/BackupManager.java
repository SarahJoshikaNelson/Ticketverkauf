package at.htlleonding;

import at.htlleonding.enums.OrderStatus;
import at.htlleonding.enums.PageType;
import at.htlleonding.enums.TicketType;
import at.htlleonding.repositories.*;
import at.htlleonding.types.*;
import at.htlleonding.types.dtos.TicketDesignDTO;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@ApplicationScoped
@AllArgsConstructor(onConstructor_ = {@Inject})
@NoArgsConstructor
public class BackupManager {
    private static final Logger log = LoggerFactory.getLogger(BackupManager.class);

    private EntityManager em;
    private DataRepo dataRepo;
    private ScheduleRepo scheduleRepo;
    private StyleRepo styleRepo;
    private TicketDesignRepo ticketDesignRepo;
    private DesignPageRepo designPageRepo;
    private DesignElementRepo designElementRepo;
    private CustomerRepo customerRepo;
    private OrderRepo orderRepo;
    private TicketRepo ticketRepo;
    private SeatRepo seatRepo;
    private ProductRepo productRepo;
    private ProductOrderRepo productOrderRepo;
    private MaturantRepo maturantRepo;
    private StudentRepo studentRepo;
    private GraduateRepo graduateRepo;
    private LayerRepo layerRepo;
    private RoomRepo roomRepo;
    private TableRepo tableRepo;
    private SettingRepo settingRepo;
    private UserRepo userRepo;
    private AdminRepo adminRepo;
    private SecurityAdminRepo securityAdminRepo;
    private OrderCacheRepo orderCacheRepo;
    private PrintedTicketIdRepo printedTicketIdRepo;

    // ==================== EXPORT ====================

    @Transactional
    public Map<String, Object> exportData(Map<String, Boolean> categories) {
        Map<String, Object> backup = new LinkedHashMap<>();
        backup.put("version", 1);
        backup.put("exportDate", LocalDateTime.now().toString());

        if (isSelected(categories, "generalData")) exportGeneralData(backup);
        if (isSelected(categories, "schedule")) exportSchedule(backup);
        if (isSelected(categories, "styling")) exportStyling(backup);
        if (isSelected(categories, "ticketDesigns")) exportTicketDesigns(backup);
        if (isSelected(categories, "customers")) exportCustomers(backup);
        if (isSelected(categories, "orders")) exportOrders(backup);
        if (isSelected(categories, "products")) exportProducts(backup);
        if (isSelected(categories, "maturants")) exportMaturants(backup);
        if (isSelected(categories, "tableLayout")) exportTableLayout(backup);
        if (isSelected(categories, "settings")) exportSettings(backup);

        return backup;
    }

    private boolean isSelected(Map<String, Boolean> categories, String key) {
        return Boolean.TRUE.equals(categories.get(key));
    }

    private void exportGeneralData(Map<String, Object> backup) {
        Data data = dataRepo.findById(1);
        if (data == null) return;

        Map<String, Object> gd = new LinkedHashMap<>();
        gd.put("title", data.getTitle());
        gd.put("subTitle", data.getSubTitle());
        gd.put("onDate", data.getOnDate() != null ? data.getOnDate().toString() : null);
        gd.put("paymentInfo", data.getPaymentInfo());
        gd.put("paymentText", data.getPaymentText());
        gd.put("physicalPickupInfo", data.getPhysicalPickupInfo());
        gd.put("organizationName", data.getOrganizationName());
        gd.put("organizationAddress", data.getOrganizationAddress());
        gd.put("footerText", data.getFooterText());
        gd.put("contactEmail", data.getContactEmail());
        gd.put("contactPhone", data.getContactPhone());
        gd.put("contactWebsite", data.getContactWebsite());
        gd.put("images", data.getImages() != null ? new ArrayList<>(data.getImages()) : null);
        gd.put("gifUrl", data.getGifUrl());
        backup.put("generalData", gd);
    }

    private void exportSchedule(Map<String, Object> backup) {
        Data data = dataRepo.findById(1);
        if (data == null || data.getSchedule() == null) return;

        List<Map<String, Object>> scheduleList = new ArrayList<>();
        for (ScheduleEntry entry : data.getSchedule()) {
            Map<String, Object> e = new LinkedHashMap<>();
            e.put("title", entry.getTitle());
            e.put("start", entry.getStart() != null ? entry.getStart().toString() : null);
            scheduleList.add(e);
        }
        backup.put("schedule", scheduleList);
    }

    private void exportStyling(Map<String, Object> backup) {
        Style style = styleRepo.findById(1);
        if (style == null) return;

        Map<String, Object> s = new LinkedHashMap<>();
        s.put("primary", style.getPrimary());
        s.put("secondary", style.getSecondary());
        s.put("accent", style.getAccent());
        s.put("borderRadius", style.getBorderRadius());
        s.put("background", style.getBackground());
        s.put("text", style.getText());
        backup.put("styling", s);
    }

    private void exportTicketDesigns(Map<String, Object> backup) {
        List<TicketDesign> designs = ticketDesignRepo.listAll();
        List<Map<String, Object>> designList = new ArrayList<>();

        for (TicketDesign design : designs) {
            Map<String, Object> d = new LinkedHashMap<>();
            d.put("name", design.getName());
            d.put("width", design.getWidth());
            d.put("height", design.getHeight());
            d.put("active", design.getActive());

            List<Map<String, Object>> pages = new ArrayList<>();
            if (design.getPages() != null) {
                for (DesignPage page : design.getPages()) {
                    Map<String, Object> p = new LinkedHashMap<>();
                    p.put("type", page.getType() != null ? page.getType().name() : null);

                    List<Map<String, Object>> elements = new ArrayList<>();
                    if (page.getElements() != null) {
                        for (DesignElement elem : page.getElements()) {
                            Map<String, Object> el = new LinkedHashMap<>();
                            el.put("type", elem.getType() != null ? elem.getType().name() : null);
                            el.put("filler", elem.getFiller() != null ? elem.getFiller().name() : null);
                            el.put("content", elem.getContent());
                            el.put("x", elem.getX());
                            el.put("y", elem.getY());
                            el.put("width", elem.getWidth());
                            el.put("height", elem.getHeight());
                            el.put("rotation", elem.getRotation());
                            el.put("zIndex", elem.getZIndex());
                            el.put("fontSize", elem.getFontSize());
                            el.put("fontWeight", elem.getFontWeight());
                            el.put("color", elem.getColor());
                            el.put("isDynamic", elem.getIsDynamic());
                            el.put("visible", elem.getVisible());
                            el.put("imageData", elem.getImageData());
                            el.put("opacity", elem.getOpacity());
                            el.put("borderRadius", elem.getBorderRadius());
                            el.put("blurIntensity", elem.getBlurIntensity());
                            el.put("backgroundColor", elem.getBackgroundColor());
                            el.put("layer", elem.getLayer());
                            elements.add(el);
                        }
                    }
                    p.put("elements", elements);
                    pages.add(p);
                }
            }
            d.put("pages", pages);
            designList.add(d);
        }
        backup.put("ticketDesigns", designList);
    }

    private void exportCustomers(Map<String, Object> backup) {
        List<Customer> customers = customerRepo.listAll();
        List<Map<String, Object>> list = new ArrayList<>();
        for (Customer c : customers) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("firstName", c.getFirstName());
            m.put("lastName", c.getLastName());
            m.put("mailAddress", c.getMailAddress());
            m.put("phoneNumber", c.getPhoneNumber());
            m.put("schoolClass", c.getSchoolClass());
            m.put("isMale", c.isMale());
            m.put("street", c.getStreet());
            m.put("streetNumber", c.getStreetNumber());
            m.put("zipCode", c.getZipCode());
            m.put("town", c.getTown());
            list.add(m);
        }
        backup.put("customers", list);
    }

    private void exportOrders(Map<String, Object> backup) {
        List<Order> orders = orderRepo.listAll();
        List<Map<String, Object>> orderList = new ArrayList<>();

        for (Order order : orders) {
            Map<String, Object> o = new LinkedHashMap<>();
            o.put("orderDate", order.getOrderDate() != null ? order.getOrderDate().toString() : null);
            o.put("status", order.getStatus().name());
            o.put("invoiceNumber", order.getInvoiceNumber());

            if (order.getCustomer() != null) {
                Customer c = order.getCustomer();
                Map<String, Object> cust = new LinkedHashMap<>();
                cust.put("firstName", c.getFirstName());
                cust.put("lastName", c.getLastName());
                cust.put("mailAddress", c.getMailAddress());
                cust.put("phoneNumber", c.getPhoneNumber());
                cust.put("schoolClass", c.getSchoolClass());
                cust.put("isMale", c.isMale());
                cust.put("street", c.getStreet());
                cust.put("streetNumber", c.getStreetNumber());
                cust.put("zipCode", c.getZipCode());
                cust.put("town", c.getTown());
                o.put("customer", cust);
            }

            List<Map<String, Object>> ticketList = new ArrayList<>();
            if (order.getTickets() != null) {
                for (Ticket t : order.getTickets()) {
                    Map<String, Object> ticket = new LinkedHashMap<>();
                    ticket.put("ticketType", t.getTicketType().name());
                    ticket.put("isPhysical", t.isPhysical());
                    ticket.put("isActivated", t.isActivated());
                    ticket.put("activatedAt", t.getActivatedAt() != null ? t.getActivatedAt().toString() : null);
                    ticketList.add(ticket);
                }
            }
            o.put("tickets", ticketList);
            orderList.add(o);
        }
        backup.put("orders", orderList);
    }

    private void exportProducts(Map<String, Object> backup) {
        List<Product> products = productRepo.listAll();
        List<Map<String, Object>> list = new ArrayList<>();
        for (Product p : products) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("title", p.getTitle());
            m.put("description", p.getDescription());
            m.put("imageUrl", p.getImageUrl());
            m.put("stock", p.getStock());
            m.put("price", p.getPrice());
            list.add(m);
        }
        backup.put("products", list);
    }

    private void exportMaturants(Map<String, Object> backup) {
        List<Maturant> maturants = maturantRepo.listAll();
        List<Map<String, Object>> list = new ArrayList<>();
        for (Maturant m : maturants) {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("ldapUser", m.getLdapUser());
            map.put("firstName", m.getFirstName());
            map.put("lastName", m.getLastName());
            map.put("className", m.getClassName());
            list.add(map);
        }
        backup.put("maturants", list);
    }

    private void exportTableLayout(Map<String, Object> backup) {
        List<Layer> layers = layerRepo.listAll();
        List<Map<String, Object>> layerList = new ArrayList<>();

        for (Layer layer : layers) {
            Map<String, Object> l = new LinkedHashMap<>();
            l.put("name", layer.getName());
            l.put("level", layer.getLevel());
            l.put("picture", layer.getPicture());

            List<Map<String, Object>> roomList = new ArrayList<>();
            if (layer.getRooms() != null) {
                for (Room room : layer.getRooms()) {
                    Map<String, Object> r = new LinkedHashMap<>();
                    r.put("name", room.getName());
                    r.put("xPosition", room.getXPosition());
                    r.put("yPosition", room.getYPosition());
                    r.put("xLength", room.getXLength());
                    r.put("yLength", room.getYLength());

                    List<Map<String, Object>> tableList = new ArrayList<>();
                    if (room.getTables() != null) {
                        for (Table table : room.getTables()) {
                            Map<String, Object> t = new LinkedHashMap<>();
                            t.put("name", table.getName());
                            t.put("xPosition", table.getXPosition());
                            t.put("yPosition", table.getYPosition());
                            t.put("xLength", table.getXLength());
                            t.put("yLength", table.getYLength());
                            t.put("selectable", table.isSelectable());

                            List<Map<String, Object>> seatList = new ArrayList<>();
                            if (table.getSeats() != null) {
                                for (Seat seat : table.getSeats()) {
                                    Map<String, Object> s = new LinkedHashMap<>();
                                    s.put("price", seat.getPrice());
                                    s.put("xPosition", seat.getXPosition());
                                    s.put("yPosition", seat.getYPosition());
                                    s.put("xLength", seat.getXLength());
                                    s.put("yLength", seat.getYLength());
                                    seatList.add(s);
                                }
                            }
                            t.put("seats", seatList);
                            tableList.add(t);
                        }
                    }
                    r.put("tables", tableList);
                    roomList.add(r);
                }
            }
            l.put("rooms", roomList);
            layerList.add(l);
        }
        backup.put("tableLayout", layerList);
    }

    private void exportSettings(Map<String, Object> backup) {
        List<Setting> settings = settingRepo.listAll();
        List<Map<String, Object>> list = new ArrayList<>();
        for (Setting s : settings) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("key", s.getKey());
            m.put("value", s.getValue());
            list.add(m);
        }
        backup.put("settings", list);
    }

    // ==================== IMPORT ====================

    @Transactional
    @SuppressWarnings("unchecked")
    public void importData(Map<String, Object> backupData) {
        log.info("Starting backup import...");

        if (backupData.containsKey("generalData")) {
            importGeneralData((Map<String, Object>) backupData.get("generalData"));
        }
        if (backupData.containsKey("schedule")) {
            importSchedule((List<Map<String, Object>>) backupData.get("schedule"));
        }
        if (backupData.containsKey("styling")) {
            importStyling((Map<String, Object>) backupData.get("styling"));
        }
        if (backupData.containsKey("ticketDesigns")) {
            importTicketDesigns((List<Map<String, Object>>) backupData.get("ticketDesigns"));
        }
        if (backupData.containsKey("customers")) {
            importCustomers((List<Map<String, Object>>) backupData.get("customers"));
        }
        if (backupData.containsKey("orders")) {
            importOrders((List<Map<String, Object>>) backupData.get("orders"));
        }
        if (backupData.containsKey("products")) {
            importProducts((List<Map<String, Object>>) backupData.get("products"));
        }
        if (backupData.containsKey("maturants")) {
            importMaturants((List<Map<String, Object>>) backupData.get("maturants"));
        }
        if (backupData.containsKey("tableLayout")) {
            importTableLayout((List<Map<String, Object>>) backupData.get("tableLayout"));
        }
        if (backupData.containsKey("settings")) {
            importSettings((List<Map<String, Object>>) backupData.get("settings"));
        }

        log.info("Backup import completed successfully.");
    }

    private void importGeneralData(Map<String, Object> gd) {
        Data data = dataRepo.findById(1);
        if (data == null) return;

        data.setTitle(str(gd, "title"));
        data.setSubTitle(str(gd, "subTitle"));
        data.setOnDate(gd.get("onDate") != null ? LocalDate.parse(str(gd, "onDate")) : null);
        data.setPaymentInfo(str(gd, "paymentInfo"));
        data.setPaymentText(str(gd, "paymentText"));
        data.setPhysicalPickupInfo(str(gd, "physicalPickupInfo"));
        data.setOrganizationName(str(gd, "organizationName"));
        data.setOrganizationAddress(str(gd, "organizationAddress"));
        data.setFooterText(str(gd, "footerText"));
        data.setContactEmail(str(gd, "contactEmail"));
        data.setContactPhone(str(gd, "contactPhone"));
        data.setContactWebsite(str(gd, "contactWebsite"));
        data.setGifUrl(str(gd, "gifUrl"));

        @SuppressWarnings("unchecked")
        List<String> images = (List<String>) gd.get("images");
        if (images != null) {
            data.setImages(images);
        }

        dataRepo.persist(data);
        log.info("Imported general data (overwrite)");
    }

    @SuppressWarnings("unchecked")
    private void importSchedule(List<Map<String, Object>> scheduleList) {
        Data data = dataRepo.findById(1);
        if (data == null) return;

        scheduleRepo.deleteAll();

        for (Map<String, Object> entry : scheduleList) {
            ScheduleEntry se = new ScheduleEntry();
            se.setTitle(str(entry, "title"));
            se.setStart(entry.get("start") != null ? LocalDateTime.parse(str(entry, "start")) : null);
            se.setData(data);
            scheduleRepo.persist(se);
        }
        log.info("Imported {} schedule entries (overwrite)", scheduleList.size());
    }

    private void importStyling(Map<String, Object> s) {
        Style style = styleRepo.findById(1);
        if (style == null) return;

        style.setPrimary(str(s, "primary"));
        style.setSecondary(str(s, "secondary"));
        style.setAccent(str(s, "accent"));
        style.setBorderRadius(intVal(s, "borderRadius"));
        style.setBackground(str(s, "background"));
        style.setText(str(s, "text"));
        styleRepo.persist(style);
        log.info("Imported styling (overwrite)");
    }

    @SuppressWarnings("unchecked")
    private void importTicketDesigns(List<Map<String, Object>> designs) {
        for (Map<String, Object> d : designs) {
            TicketDesign design = new TicketDesign();
            design.setName(str(d, "name"));
            design.setWidth(intVal(d, "width"));
            design.setHeight(intVal(d, "height"));
            design.setActive(d.get("active") != null ? (Boolean) d.get("active") : false);

            ticketDesignRepo.persist(design);

            List<Map<String, Object>> pages = (List<Map<String, Object>>) d.get("pages");
            if (pages != null) {
                List<DesignPage> designPages = new ArrayList<>();
                for (Map<String, Object> p : pages) {
                    DesignPage page = new DesignPage();
                    page.setType(p.get("type") != null ? PageType.valueOf(str(p, "type")) : PageType.FRONT);
                    page.setTicketDesign(design);
                    designPageRepo.persist(page);

                    List<Map<String, Object>> elements = (List<Map<String, Object>>) p.get("elements");
                    if (elements != null) {
                        for (Map<String, Object> el : elements) {
                            DesignElement elem = new DesignElement();
                            elem.setType(el.get("type") != null ?
                                    TicketDesignDTO.DesignElementTypes.valueOf(str(el, "type")) : null);
                            elem.setFiller(el.get("filler") != null ?
                                    TicketDesignDTO.DesignElementFillers.valueOf(str(el, "filler")) : null);
                            elem.setDesignPage(page);
                            elem.setContent(str(el, "content"));
                            elem.setX(intVal(el, "x"));
                            elem.setY(intVal(el, "y"));
                            elem.setWidth(intVal(el, "width"));
                            elem.setHeight(intVal(el, "height"));
                            elem.setRotation(intVal(el, "rotation"));
                            elem.setZIndex(intVal(el, "zIndex"));
                            elem.setFontSize(el.get("fontSize") != null ? intVal(el, "fontSize") : null);
                            elem.setFontWeight(str(el, "fontWeight"));
                            elem.setColor(str(el, "color"));
                            elem.setIsDynamic(el.get("isDynamic") != null ? (Boolean) el.get("isDynamic") : false);
                            elem.setVisible(el.get("visible") != null ? (Boolean) el.get("visible") : true);
                            elem.setImageData(str(el, "imageData"));
                            elem.setOpacity(el.get("opacity") != null ? intVal(el, "opacity") : null);
                            elem.setBorderRadius(el.get("borderRadius") != null ? intVal(el, "borderRadius") : null);
                            elem.setBlurIntensity(el.get("blurIntensity") != null ? intVal(el, "blurIntensity") : null);
                            elem.setBackgroundColor(str(el, "backgroundColor"));
                            elem.setLayer(el.get("layer") != null ? intVal(el, "layer") : null);
                            designElementRepo.persist(elem);
                        }
                    }
                    designPages.add(page);
                }
                design.setPages(designPages);
            }
        }
        log.info("Imported {} ticket designs (append)", designs.size());
    }

    private void importCustomers(List<Map<String, Object>> customers) {
        for (Map<String, Object> c : customers) {
            Customer customer = new Customer();
            customer.setId(UUID.randomUUID());
            customer.setFirstName(str(c, "firstName"));
            customer.setLastName(str(c, "lastName"));
            customer.setMailAddress(str(c, "mailAddress"));
            customer.setPhoneNumber(str(c, "phoneNumber"));
            customer.setSchoolClass(str(c, "schoolClass"));
            customer.setMale(c.get("isMale") != null && (Boolean) c.get("isMale"));
            customer.setStreet(str(c, "street"));
            customer.setStreetNumber(str(c, "streetNumber"));
            customer.setZipCode(str(c, "zipCode"));
            customer.setTown(str(c, "town"));
            customerRepo.persist(customer);
        }
        log.info("Imported {} customers (append)", customers.size());
    }

    @SuppressWarnings("unchecked")
    private void importOrders(List<Map<String, Object>> orders) {
        for (Map<String, Object> o : orders) {
            Customer customer = null;
            Map<String, Object> custData = (Map<String, Object>) o.get("customer");
            if (custData != null) {
                customer = new Customer();
                customer.setId(UUID.randomUUID());
                customer.setFirstName(str(custData, "firstName"));
                customer.setLastName(str(custData, "lastName"));
                customer.setMailAddress(str(custData, "mailAddress"));
                customer.setPhoneNumber(str(custData, "phoneNumber"));
                customer.setSchoolClass(str(custData, "schoolClass"));
                customer.setMale(custData.get("isMale") != null && (Boolean) custData.get("isMale"));
                customer.setStreet(str(custData, "street"));
                customer.setStreetNumber(str(custData, "streetNumber"));
                customer.setZipCode(str(custData, "zipCode"));
                customer.setTown(str(custData, "town"));
                customerRepo.persist(customer);
            }

            Order order = new Order();
            order.setStatus(OrderStatus.valueOf(str(o, "status")));
            order.setOrderDate(o.get("orderDate") != null ? LocalDateTime.parse(str(o, "orderDate")) : LocalDateTime.now());
            order.setCustomer(customer);
            if (o.get("invoiceNumber") != null) {
                order.setInvoiceNumber(((Number) o.get("invoiceNumber")).longValue());
            }
            orderRepo.persist(order);

            List<Map<String, Object>> tickets = (List<Map<String, Object>>) o.get("tickets");
            if (tickets != null) {
                for (Map<String, Object> t : tickets) {
                    Ticket ticket = new Ticket();
                    ticket.setOrder(order);
                    ticket.setTicketType(TicketType.valueOf(str(t, "ticketType")));
                    ticket.setPhysical(t.get("isPhysical") != null && (Boolean) t.get("isPhysical"));
                    ticket.setActivated(t.get("isActivated") != null && (Boolean) t.get("isActivated"));
                    ticket.setActivatedAt(t.get("activatedAt") != null ? LocalDateTime.parse(str(t, "activatedAt")) : null);
                    ticketRepo.persist(ticket);
                }
            }
        }
        log.info("Imported {} orders (append)", orders.size());
    }

    private void importProducts(List<Map<String, Object>> products) {
        for (Map<String, Object> p : products) {
            Product product = new Product();
            product.setTitle(str(p, "title"));
            product.setDescription(str(p, "description"));
            product.setImageUrl(str(p, "imageUrl"));
            product.setStock(intVal(p, "stock"));
            product.setPrice(doubleVal(p, "price"));
            productRepo.persist(product);
        }
        log.info("Imported {} products (append)", products.size());
    }

    private void importMaturants(List<Map<String, Object>> maturants) {
        for (Map<String, Object> m : maturants) {
            String ldapUser = str(m, "ldapUser");
            if (ldapUser != null && maturantRepo.findById(ldapUser) == null) {
                Maturant maturant = new Maturant();
                maturant.setLdapUser(ldapUser);
                maturant.setFirstName(str(m, "firstName"));
                maturant.setLastName(str(m, "lastName"));
                maturant.setClassName(str(m, "className"));
                maturantRepo.persist(maturant);
            }
        }
        log.info("Imported {} maturants (append, skipping duplicates)", maturants.size());
    }

    @SuppressWarnings("unchecked")
    private void importTableLayout(List<Map<String, Object>> layers) {
        // Overwrite existing layout before import.
        em.createQuery("UPDATE Seat s SET s.order = null").executeUpdate();
        seatRepo.deleteAll();
        tableRepo.deleteAll();
        roomRepo.deleteAll();
        layerRepo.deleteAll();

        for (Map<String, Object> l : layers) {
            Layer layer = new Layer();
            layer.setName(str(l, "name"));
            layer.setLevel(intVal(l, "level"));
            layer.setPicture(str(l, "picture"));
            layerRepo.persist(layer);

            List<Map<String, Object>> rooms = (List<Map<String, Object>>) l.get("rooms");
            if (rooms == null) {
                continue;
            }

            for (Map<String, Object> r : rooms) {
                Room room = new Room();
                room.setName(str(r, "name"));
                room.setLayer(layer);
                room.setXPosition(intVal(r, "xPosition"));
                room.setYPosition(intVal(r, "yPosition"));
                room.setXLength(intVal(r, "xLength"));
                room.setYLength(intVal(r, "yLength"));
                roomRepo.persist(room);

                List<Map<String, Object>> tables = (List<Map<String, Object>>) r.get("tables");
                if (tables == null) {
                    continue;
                }

                for (Map<String, Object> t : tables) {
                    Table table = new Table();
                    table.setName(str(t, "name"));
                    table.setRoom(room);
                    table.setXPosition(intVal(t, "xPosition"));
                    table.setYPosition(intVal(t, "yPosition"));
                    table.setXLength(intVal(t, "xLength"));
                    table.setYLength(intVal(t, "yLength"));
                    table.setSelectable(t.get("selectable") != null && (Boolean) t.get("selectable"));
                    tableRepo.persist(table);

                    List<Map<String, Object>> seats = (List<Map<String, Object>>) t.get("seats");
                    if (seats == null) {
                        continue;
                    }

                    for (Map<String, Object> s : seats) {
                        Seat seat = new Seat();
                        seat.setId(UUID.randomUUID());
                        seat.setTable(table);
                        seat.setPrice(doubleVal(s, "price"));
                        seat.setXPosition(intVal(s, "xPosition"));
                        seat.setYPosition(intVal(s, "yPosition"));
                        seat.setXLength(intVal(s, "xLength"));
                        seat.setYLength(intVal(s, "yLength"));
                        seatRepo.persist(seat);
                    }
                }
            }
        }
        log.info("Imported {} layers (overwrite)", layers.size());
    }

    private void importSettings(List<Map<String, Object>> settings) {
        for (Map<String, Object> s : settings) {
            String key = str(s, "key");
            if (key == null || key.isBlank()) {
                continue;
            }

            Setting setting = settingRepo.findById(key);
            if (setting == null) {
                setting = new Setting();
                setting.setKey(key);
            }
            setting.setValue(intVal(s, "value"));
            settingRepo.persist(setting);
        }
        log.info("Imported {} settings (upsert)", settings.size());
    }

    // ==================== RESET ====================

    /**
     * @param ldapAdminIdToKeep          principal name when logged in via LDAP/OIDC; kept if an {@link Admin} row exists for that id
     * @param securityAdminUsernameToKeep username claim from dashboard JWT when logged in as {@link SecurityAdmin}; kept if that row exists
     */
    @Transactional
    public void resetAllData(String ldapAdminIdToKeep, String securityAdminUsernameToKeep) {
        log.warn("RESETTING ALL DATA FOR NEW YEAR");

        // Delete all order-related and user-related data first.
        em.createQuery("UPDATE Seat s SET s.order = null").executeUpdate();
        em.createQuery("DELETE FROM StudentOrder").executeUpdate();
        em.createQuery("DELETE FROM ProductOrder").executeUpdate();
        em.createQuery("DELETE FROM TicketUpgrade").executeUpdate();
        em.createQuery("DELETE FROM Ticket").executeUpdate();
        em.createQuery("DELETE FROM Order").executeUpdate();
        em.createQuery("DELETE FROM Customer").executeUpdate();
        em.createQuery("DELETE FROM OrderCache").executeUpdate();
        em.createQuery("DELETE FROM PrintedTicketId").executeUpdate();
        em.createQuery("DELETE FROM User").executeUpdate();
        purgeLdapAdminsExcept(ldapAdminIdToKeep);
        purgeSecurityAdminsExcept(securityAdminUsernameToKeep);
        em.createQuery("DELETE FROM Maturant").executeUpdate();
        em.createQuery("DELETE FROM Student").executeUpdate();
        em.createQuery("DELETE FROM Graduate").executeUpdate();

        // Delete shop products.
        productRepo.deleteAll();

        // Delete ticket design data.
        designElementRepo.deleteAll();
        designPageRepo.deleteAll();
        ticketDesignRepo.deleteAll();

        // Delete table layout data.
        seatRepo.deleteAll();
        tableRepo.deleteAll();
        roomRepo.deleteAll();
        layerRepo.deleteAll();

        // Clear general data and schedule while keeping the singleton Data row.
        scheduleRepo.deleteAll();
        Data data = dataRepo.findById(1);
        if (data != null) {
            data.setTitle("");
            data.setSubTitle("");
            data.setOnDate(null);
            data.setPaymentInfo("");
            data.setPaymentText("");
            data.setPhysicalPickupInfo("");
            data.setOrganizationName("");
            data.setOrganizationAddress("");
            data.setFooterText("");
            data.setContactEmail("");
            data.setContactPhone("");
            data.setContactWebsite("");
            data.setGifUrl("");
            data.setImages(new ArrayList<>());
            dataRepo.persist(data);
        }

        // Reset style to sane defaults while keeping the singleton Style row.
        Style style = styleRepo.findById(1);
        if (style != null) {
            style.setPrimary("#1dc1e2");
            style.setSecondary("#1f2fe0");
            style.setAccent("#3e1de2");
            style.setBorderRadius(8);
            style.setBackground("#0a0a0a");
            style.setText("#f5f5f5");
            styleRepo.persist(style);
        }

        // Keep technical/API key string settings untouched; only reset counters/phase.
        Setting phase = settingRepo.findById("Phase");
        if (phase == null) {
            phase = new Setting();
            phase.setKey("Phase");
        }
        phase.setValue(0);
        settingRepo.persist(phase);

        Setting ticketCount = settingRepo.findById("BoughtTicketCount");
        if (ticketCount != null) {
            ticketCount.setValue(0);
            settingRepo.persist(ticketCount);
        }

        log.warn("All data has been reset for a new year. Phase set to 0.");
    }

    private void purgeLdapAdminsExcept(String keepLdapId) {
        if (keepLdapId != null && !keepLdapId.isBlank()) {
            String id = keepLdapId.trim();
            Admin self = adminRepo.findById(id);
            if (self != null) {
                em.createQuery("DELETE FROM Admin a WHERE a.id <> :id").setParameter("id", id).executeUpdate();
                log.info("Preserved LDAP-linked Admin id={} during reset", id);
                return;
            }
        }
        em.createQuery("DELETE FROM Admin").executeUpdate();
    }

    private void purgeSecurityAdminsExcept(String keepUsername) {
        if (keepUsername != null && !keepUsername.isBlank()) {
            String u = keepUsername.trim();
            SecurityAdmin self = securityAdminRepo.find("username", u).firstResult();
            if (self != null) {
                em.createQuery("DELETE FROM SecurityAdmin s WHERE s.username <> :u").setParameter("u", u).executeUpdate();
                log.info("Preserved SecurityAdmin username={} during reset", u);
                return;
            }
        }
        em.createQuery("DELETE FROM SecurityAdmin").executeUpdate();
    }

    // ==================== HELPERS ====================

    private String str(Map<String, Object> map, String key) {
        Object val = map.get(key);
        return val != null ? val.toString() : null;
    }

    private int intVal(Map<String, Object> map, String key) {
        Object val = map.get(key);
        if (val instanceof Number) return ((Number) val).intValue();
        if (val instanceof String) return Integer.parseInt((String) val);
        return 0;
    }

    private double doubleVal(Map<String, Object> map, String key) {
        Object val = map.get(key);
        if (val instanceof Number) return ((Number) val).doubleValue();
        if (val instanceof String) return Double.parseDouble((String) val);
        return 0.0;
    }
}
