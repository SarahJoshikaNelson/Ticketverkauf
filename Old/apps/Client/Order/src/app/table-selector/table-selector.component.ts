import {
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
  AfterViewInit,
  ViewChild,
  ElementRef,
  OnDestroy,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { TableWebSocketService } from '../table-web-socket.service';
import { Seat, Table, Room, Layer } from '@ticket-system/models/order';
import { RoomModel, TableModel, SeatModel } from './models';
import { CanvasUtils } from './utils/canvas-utils';
import { ZoomUtils } from './utils/zoom-utils';
import { InteractionUtils } from './utils/interaction-utils';
import { SelectionUtils } from './utils/selection-utils';

@Component({
  selector: 'app-table-selector',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './table-selector.component.html',
  styleUrls: ['./table-selector.component.css'],
})
export class TableSelectorComponent implements AfterViewInit, OnDestroy, OnChanges {
  @ViewChild('tablesCanvas', { static: false })
  tablesCanvas!: ElementRef<HTMLCanvasElement>;

  private canvasUtils: CanvasUtils;
  private zoomUtils: ZoomUtils;
  private interactionUtils: InteractionUtils;
  private selectionUtils: SelectionUtils;

  // start position (currently middle of the canvas)
  private startX = 0;
  private startY = 0;

  zoomLevel = signal<number>(0.8); // Default value, will be updated in constructor
  panX = signal<number>(0);
  panY = signal<number>(0);
  isPanning = false;
  wasPanning = false;
  hoveredElement: Table | Seat | null = null;
  rooms: Room[] = [];
  connectionStatus: 'connected' | 'disconnected' | 'error' = 'disconnected';
  connectionError: boolean = false;

  // Layer management
  layers: Layer[] = [];
  selectedLayerName = signal<string>('');
  currentLayer: Layer | null = null;
  private cachedBackgroundImage: HTMLImageElement | null = null;

  @Input()
  selectedSeats: Seat[] = [];

  @Input()
  isModal: boolean = false;

  @Input()
  canvasWidth: number = 524;

  @Input()
  canvasHeight: number = 500;

  @Input()
  selectedLayerFromParent: string = '';

  @Output()
  selectedSeatsChange = new EventEmitter<Seat[]>();

  @Output()
  connectionStatusChange = new EventEmitter<'connected' | 'disconnected' | 'error'>();

  private roomsSubscription: any;
  private seatsSubscription: any;
  private layersSubscription: any;
  private connectionStatusSubscription: any;
  private selectedSeatIds = new Set<string>();
  private userSelectedSeatIds = new Set<string>();
  private hasRestoredSeats = false;
  private hasSentRestoredSeats = false;
  private hasReceivedInitialSelections = false;

  constructor(private tableWebSocketService: TableWebSocketService) {
    this.canvasUtils = new CanvasUtils();
    this.zoomUtils = new ZoomUtils();
    this.interactionUtils = new InteractionUtils();
    this.selectionUtils = new SelectionUtils(this.interactionUtils);
    this.zoomLevel.set(0.8); // Start with tables and seats visible
  }

  async ngOnInit() {
    try {
      // Load initial data via REST API
      const rooms = await this.tableWebSocketService.loadInitialData();

      // Subscribe to layers observable so the select is populated reactively
      this.layersSubscription = this.tableWebSocketService.layers$.subscribe((layers: Layer[]) => {
        if (layers && layers.length > 0) {
          this.layers = layers;

          // If we have a parent-provided layer selection, use it
          let layerToSelect = this.selectedLayerFromParent;

          // If no layer selected yet, pick the first
          if (!layerToSelect || !this.selectedLayerName() || !this.currentLayer) {
            layerToSelect = layers[0].name;
            this.selectedLayerName.set(layerToSelect);
            this.currentLayer = layers[0];
            this.processRooms(this.currentLayer.rooms);
          } else {
            // If a layer is already selected, try to keep it
            const sel = layers.find(l => l.name === layerToSelect);
            if (sel) {
              this.currentLayer = sel;
              this.selectedLayerName.set(layerToSelect);
              this.processRooms(sel.rooms);
            } else {
              // Fallback to first layer if the parent layer isn't available
              this.selectedLayerName.set(layers[0].name);
              this.currentLayer = layers[0];
              this.processRooms(this.currentLayer.rooms);
            }
          }
        } else {
          // No layers available, fall back to rooms from the initial load
          this.layers = [];
          this.processRooms(rooms);
        }
      });

      // Subscribe to connection status changes
      this.connectionStatusSubscription = this.tableWebSocketService.connectionStatus$.subscribe((status) => {
        this.connectionStatus = status;
        this.connectionError = status === 'error';
        this.connectionStatusChange.emit(status);

        // When connection is established and we have initial selections, validate restored seats
        if (status === 'connected' && this.hasRestoredSeats && !this.hasSentRestoredSeats && this.hasReceivedInitialSelections) {
          this.validateRestoredSeats();
        }
      });

      // Connect to WebSocket for real-time updates
      try {
        await this.tableWebSocketService.connect();

        // Subscribe to room updates (should be static after initial load)
        this.roomsSubscription = this.tableWebSocketService.rooms$.subscribe((rooms: Room[]) => {
          if (rooms && rooms.length > 0) {
            // Only process rooms for the currently selected layer
            if (this.currentLayer) {
              this.processRooms(this.currentLayer.rooms);
            } else {
              this.processRooms(rooms);
            }
          }
        });

        // Subscribe to seat selection updates
        this.seatsSubscription = this.tableWebSocketService.selectedSeats$.subscribe((selectedSeatIds: Set<string>) => {
          this.selectedSeatIds = selectedSeatIds;

          // On first selection update, validate restored seats
          if (!this.hasReceivedInitialSelections && this.hasRestoredSeats && !this.hasSentRestoredSeats) {
            this.hasReceivedInitialSelections = true;
            this.validateRestoredSeats();
          } else {
            this.hasReceivedInitialSelections = true;
          }

          this.updateSelectedSeats();
          this.drawCanvas();
        });
      } catch (error) {
        console.error('Failed to connect to WebSocket:', error);
        this.connectionError = true;
        this.connectionStatus = 'error';
        this.connectionStatusChange.emit('error');
      }

    } catch (error) {
      console.error('Error initializing TableSelectorComponent:', error);
      this.connectionError = true;
      this.connectionStatus = 'error';
      this.connectionStatusChange.emit('error');
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['selectedSeats'] && changes['selectedSeats'].currentValue !== undefined) {
      const seats = changes['selectedSeats'].currentValue;

      if (!changes['selectedSeats'].firstChange) {
        // This is a programmatic change after initial load
        // Sync userSelectedSeatIds with the new seats array
        this.userSelectedSeatIds.clear();
        seats.forEach((seat: Seat) => {
          this.userSelectedSeatIds.add(seat.id);
        });

        // If this is the first time we're loading seats (restoration from sessionStorage)
        if (seats.length > 0 && !this.hasRestoredSeats) {
          this.hasRestoredSeats = true;

          // If websocket is already connected and has initial data, validate immediately
          if (this.connectionStatus === 'connected' && !this.hasSentRestoredSeats && this.hasReceivedInitialSelections) {
            this.validateRestoredSeats();
          }
        }

        this.drawCanvas();
      }
    }

    // Handle layer changes from parent component
    if (changes['selectedLayerFromParent']) {
      const parentSelectedLayer = changes['selectedLayerFromParent'].currentValue;
      // Only apply if it's not empty and different from current
      if (parentSelectedLayer && parentSelectedLayer !== this.selectedLayerName()) {
        // If layers are already loaded, apply immediately
        if (this.layers.length > 0) {
          this.onLayerChange(parentSelectedLayer);
        } else {
          // Store it so ngOnInit can use it when layers are loaded
          // (it will be picked up in the subscription)
        }
      }
    }
  }

  private processRooms(rooms: any[]) {
    const layerName = this.currentLayer?.name || '';

    this.rooms = rooms.map((room) => {
      const processedRoom = new RoomModel(
        room.name,
        (room.tables || []).map((table: any) => {
          const processedTable = new TableModel(
            table.name,
            room.name, // room name reference
            table.selectable ?? true,
            (table.seats || []).map((seat: any) => {
              return new SeatModel(
                seat.id,
                seat.price ?? 0,
                seat.xposition ?? 0,
                seat.yposition ?? 0,
                seat.xlength ?? 20, // Default seat size
                seat.ylength ?? 20, // Default seat size
                table.name, // table name reference
                seat.order, // order reference (optional)
                seat.taken ?? false // taken status (default to false if not provided)
              );
            }),
            table.xposition ?? 0,
            table.yposition ?? 0,
            table.xlength ?? 100, // Default table size
            table.ylength ?? 100  // Default table size
          );
          return processedTable;
        }),
        room.xposition ?? 0,
        room.yposition ?? 0,
        room.xlength ?? 500, // Default room size
        room.ylength ?? 500,  // Default room size
        layerName
      );
      return processedRoom;
    });

    this.updateSelectedSeats();
    this.drawCanvas();
  }

  public onLayerChange(layerName: string) {
    this.selectedLayerName.set(layerName);

    // Find the selected layer
    const selectedLayer = this.layers.find(layer => layer.name === layerName);
    if (selectedLayer) {
      this.currentLayer = selectedLayer;
      this.cachedBackgroundImage = null; // Clear cache when layer changes
      this.processRooms(selectedLayer.rooms);
      // Reset zoom and pan when switching layers
      this.zoomLevel.set(0.8);
      this.panX.set(0);
      this.panY.set(0);
    }
  }

  public updateSelectedSeats() {
    // Get all seats from all tables
    const allSeats = this.getAllSeats();

    // Filter to only user-selected seats
    this.selectedSeats = allSeats.filter((seat: Seat) =>
      this.userSelectedSeatIds.has(seat.id)
    );

    // Note: We don't modify this.selectedSeatIds here anymore
    // The WebSocket service manages the global selectedSeatIds set
    // This method only manages this.selectedSeats (current user's selections)

    this.selectedSeatsChange.emit(this.selectedSeats);
  }

  private getAllSeats(): Seat[] {
    return this.rooms.flatMap(room =>
      room.tables.flatMap(table => table.seats)
    );
  }

  getTotalPrice(): number {
    return this.selectedSeats.reduce((total, seat) => total + seat.price, 0);
  }

  // Public method to trigger resize when modal opens
  public triggerResize() {
    if (this.isModal) {
      setTimeout(() => {
        this.resizeCanvas();
      }, 100);
    }
  }

  ngAfterViewInit() {
    this.resizeCanvas();
    this.drawCanvas();
    this.setupEventListeners();

    if (this.isModal) {
      // Add resize listener for modal mode
      window.addEventListener('resize', this.onWindowResize.bind(this));
    }

    // Restore seats from input after component is fully initialized
    if (this.selectedSeats && this.selectedSeats.length > 0 && !this.hasRestoredSeats) {
      this.userSelectedSeatIds.clear();
      this.selectedSeats.forEach((seat: Seat) => {
        this.userSelectedSeatIds.add(seat.id);
      });
      this.hasRestoredSeats = true;

      // Draw canvas immediately to show restored seats visually
      this.drawCanvas();

      // If websocket is already connected and has initial data, validate immediately
      if (this.connectionStatus === 'connected' && !this.hasSentRestoredSeats && this.hasReceivedInitialSelections) {
        this.validateRestoredSeats();
      }
    }
  }


  private onWindowResize() {
    if (this.isModal) {
      setTimeout(() => {
        this.resizeCanvas();
        this.drawCanvas();
      }, 100); // Small delay to ensure DOM is updated
    }
  }

  private resizeCanvas() {
    const canvas = this.tablesCanvas.nativeElement;
    const container = canvas.parentElement;

    if (this.isModal && container) {
      // Use a timeout to ensure the container is properly sized
      setTimeout(() => {
        const containerRect = container.getBoundingClientRect();
        // Use the larger of container size or input dimensions
        const containerWidth = Math.max(containerRect.width, this.canvasWidth);
        const containerHeight = Math.max(containerRect.height, this.canvasHeight);

        // Set canvas dimensions to match container
        canvas.width = containerWidth;
        canvas.height = containerHeight;

        // Set CSS dimensions
        canvas.style.width = containerWidth + 'px';
        canvas.style.height = containerHeight + 'px';

        // Redraw after resize
        this.drawCanvas();
      }, 50);
    } else {
      // For non-modal usage, use the input dimensions
      canvas.width = this.canvasWidth;
      canvas.height = this.canvasHeight;
      canvas.style.width = this.canvasWidth + 'px';
      canvas.style.height = this.canvasHeight + 'px';
    }
  }

  private setupEventListeners() {
    const canvas = this.tablesCanvas.nativeElement;
    canvas.addEventListener('wheel', this.onMouseWheel.bind(this));
    canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    canvas.addEventListener('mouseleave', this.onMouseUp.bind(this));
    canvas.addEventListener('click', this.onCanvasClick.bind(this));
  }

  getAllTables(): Table[] {
    return this.rooms.flatMap((room) => room.tables);
  }

  public drawCanvas() {
    if (!this.tablesCanvas?.nativeElement) {
      console.warn('Canvas not initialized yet, skipping draw');
      return;
    }

    const canvas = this.tablesCanvas.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('Failed to get 2D context');
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(this.panX(), this.panY());
    ctx.scale(this.zoomLevel(), this.zoomLevel());

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Draw layer background image if available
    if (this.currentLayer?.picture) {
      if (this.cachedBackgroundImage) {
        // Use cached image for better performance
        ctx.drawImage(this.cachedBackgroundImage, 0, 0);
        this.drawCanvasElements(ctx);
        ctx.restore();
      } else {
        // Load image and cache it
        const img = new Image();
        img.onload = () => {
          this.cachedBackgroundImage = img;
          // Draw the image at the origin (0,0) in the transformed coordinate system
          ctx.drawImage(img, 0, 0);

          // Continue drawing other elements after the image loads
          this.drawCanvasElements(ctx);

          // Restore canvas state after everything is drawn
          ctx.restore();
        };
        img.onerror = () => {
          console.error('Failed to load background image');
          this.drawCanvasElements(ctx);
          ctx.restore();
        };
        img.src = `data:image/jpeg;base64,${this.currentLayer.picture}`;
      }
    } else {
      // No background image, draw elements directly
      this.drawCanvasElements(ctx);
      ctx.restore();
    }
  }

  private drawCanvasElements(ctx: CanvasRenderingContext2D) {
    if (this.zoomLevel() < this.zoomUtils.roomsZoomThreshold) {
      this.canvasUtils.drawRooms(ctx, this.rooms);
    } else {
      const allTables = this.getAllTables();
      const allSeats = this.getAllSeats();
      // Draw seat lines first so they appear behind tables and seats
      this.canvasUtils.drawSeatLines(ctx, allTables);
      this.canvasUtils.drawTables(ctx, allTables, this.selectedSeats, this.hoveredElement, this.selectedSeatIds);
      this.canvasUtils.drawRooms(ctx, this.rooms, false);
    }
  }

  onCanvasClick(event: MouseEvent) {
    if (this.isPanning || this.wasPanning) {
      this.wasPanning = false;
      return;
    }

    const { x, y } = this.interactionUtils.getMousePosition(
      event,
      this.tablesCanvas.nativeElement,
      this.panX(),
      this.panY(),
      this.zoomLevel()
    );

    if (this.zoomLevel() < this.zoomUtils.roomsZoomThreshold) {
      this.selectionUtils.handleRoomSelection(
        x,
        y,
        this.rooms,
        this.tablesCanvas.nativeElement,
        this.zoomUtils.roomZoom,
        (targetX, targetY, targetZoom) => {
          this.zoomUtils.animateZoom(
            targetX,
            targetY,
            targetZoom,
            this.zoomLevel(),
            this.panX(),
            this.panY(),
            this.tablesCanvas.nativeElement,
            (zoom, panX, panY) => {
              this.zoomLevel.set(zoom);
              this.panX.set(panX);
              this.panY.set(panY);
              this.drawCanvas();
            }
          );
        }
      );
    } else {
      const allTables = this.getAllTables();
      this.handleTableOrSeatClick(x, y, allTables);
    }
    this.drawCanvas();
  }

  private handleTableOrSeatClick(x: number, y: number, allTables: Table[]) {
    // First check if a table was clicked
    const clickedTable = this.findClickedTable(x, y, allTables);

    if (clickedTable && clickedTable.selectable) {
      // Handle table selection - select all seats in the table
      this.handleTableClick(clickedTable);
      return;
    }

    // If no selectable table was clicked, check for individual seat clicks
    this.handleSeatClick(x, y, allTables);
  }

  private handleTableClick(table: Table) {
    // Check if any seats in the table are taken
    const hasTakenSeats = table.seats.some(seat => seat.taken);
    if (hasTakenSeats) {
      console.log('Cannot select table with taken seats');
      return;
    }

    // Check if any seats are selected by others
    const hasSelectedByOthers = table.seats.some(seat =>
      this.selectedSeatIds.has(seat.id) && !this.userSelectedSeatIds.has(seat.id)
    );
    if (hasSelectedByOthers) {
      console.log('Cannot select table with seats selected by others');
      return;
    }

    // Get all seat IDs in the table
    const tableSeatIds = table.seats.map(seat => seat.id);

    // Check if all seats are already selected by current user
    const allSelectedByUser = tableSeatIds.every(seatId => this.userSelectedSeatIds.has(seatId));

    if (allSelectedByUser) {
      // Unselect all seats in the table
      tableSeatIds.forEach(seatId => this.userSelectedSeatIds.delete(seatId));
      this.tableWebSocketService.sendSeatUnselection(tableSeatIds);
    } else {
      // Select all seats in the table
      tableSeatIds.forEach(seatId => this.userSelectedSeatIds.add(seatId));
      this.tableWebSocketService.sendSeatSelection(tableSeatIds);
    }

    this.updateSelectedSeats();
  }

  private handleSeatClick(x: number, y: number, allTables: Table[]) {
    // Find clicked seat
    const clickedSeat = this.findClickedSeat(x, y, allTables);

    if (!clickedSeat) {
      return;
    }

    // Find the table this seat belongs to
    const seatTable = allTables.find(table =>
      table.seats.some(seat => seat.id === clickedSeat.id)
    );

    // If the table is selectable, don't allow individual seat clicks
    if (seatTable && seatTable.selectable) {
      console.log('Individual seat selection disabled for selectable table');
      return;
    }

    // Check if seat is taken (already booked)
    if (clickedSeat.taken) {
      console.log('Seat is already booked:', clickedSeat.id);
      return;
    }

    // Check if seat is available (not selected by others)
    if (this.selectedSeatIds.has(clickedSeat.id) && !this.userSelectedSeatIds.has(clickedSeat.id)) {
      console.log('Seat is not available (selected by others):', clickedSeat.id);
      return;
    }

    // Toggle seat selection
    if (this.userSelectedSeatIds.has(clickedSeat.id)) {
      // Unselect seat
      this.userSelectedSeatIds.delete(clickedSeat.id);
      this.tableWebSocketService.sendSeatUnselection([clickedSeat.id]);
    } else {
      // Select seat
      this.userSelectedSeatIds.add(clickedSeat.id);
      this.tableWebSocketService.sendSeatSelection([clickedSeat.id]);
    }

    this.updateSelectedSeats();
  }

  private findClickedTable(x: number, y: number, allTables: Table[]): Table | null {
    for (const table of allTables) {
      if (x >= table.xposition && x <= table.xposition + table.xlength &&
        y >= table.yposition && y <= table.yposition + table.ylength) {
        return table;
      }
    }
    return null;
  }

  private findClickedSeat(x: number, y: number, allTables: Table[]): SeatModel | null {
    for (const table of allTables) {
      for (const seat of table.seats) {
        if (x >= seat.xposition && x <= seat.xposition + seat.xlength &&
          y >= seat.yposition && y <= seat.yposition + seat.ylength) {
          return seat as SeatModel;
        }
      }
    }
    return null;
  }

  onMouseWheel(event: WheelEvent) {
    event.preventDefault();
    const result = event.deltaY < 0
      ? this.zoomUtils.zoomIn(
        event.clientX,
        event.clientY,
        this.zoomLevel(),
        this.panX(),
        this.panY(),
        this.tablesCanvas.nativeElement
      )
      : this.zoomUtils.zoomOut(
        event.clientX,
        event.clientY,
        this.zoomLevel(),
        this.panX(),
        this.panY(),
        this.tablesCanvas.nativeElement
      );

    this.zoomLevel.set(result.zoomLevel);
    this.panX.set(result.panX);
    this.panY.set(result.panY);
    this.drawCanvas();
  }

  onMouseDown(event: MouseEvent) {
    this.isPanning = true;
    this.wasPanning = false;
    this.startX = event.clientX - this.panX();
    this.startY = event.clientY - this.panY();
  }

  onMouseMove(event: MouseEvent) {
    if (this.isPanning) {
      this.panX.set(event.clientX - this.startX);
      this.panY.set(event.clientY - this.startY);
      this.wasPanning = true;
      this.drawCanvas();
      return;
    }

    const { x, y } = this.interactionUtils.getMousePosition(
      event,
      this.tablesCanvas.nativeElement,
      this.panX(),
      this.panY(),
      this.zoomLevel()
    );

    const newHoveredElement = this.interactionUtils.findHoveredElement(x, y, this.getAllTables(), this.selectedSeatIds);

    if (this.hoveredElement !== newHoveredElement) {
      this.hoveredElement = newHoveredElement;
      this.drawCanvas();
    }
  }

  onMouseUp(event: MouseEvent) {
    this.isPanning = false;
  }

  private validateRestoredSeats() {
    if (this.hasSentRestoredSeats || this.userSelectedSeatIds.size === 0) {
      return;
    }

    const allSeats = this.getAllSeats();
    const restoredSeatIds = Array.from(this.userSelectedSeatIds);
    const unavailableSeatIds: string[] = [];

    // Check which restored seats are no longer available
    for (const seatId of restoredSeatIds) {
      const seat = allSeats.find(s => s.id === seatId);

      // If seat doesn't exist, is taken, or is selected by another user, mark as unavailable
      if (!seat || seat.taken || (this.selectedSeatIds.has(seatId) && !this.userSelectedSeatIds.has(seatId))) {
        unavailableSeatIds.push(seatId);
      }
    }

    // Remove unavailable seats from local selection
    unavailableSeatIds.forEach(seatId => this.userSelectedSeatIds.delete(seatId));

    // Also remove from global frontend state (WebSocket service)
    if (unavailableSeatIds.length > 0) {
      this.tableWebSocketService.sendSeatUnselection(unavailableSeatIds);
    }

    // Update the UI
    this.updateSelectedSeats();

    // If there are still seats available, send them to WebSocket
    if (this.userSelectedSeatIds.size > 0) {
      this.sendRestoredSeatsToWebSocket();
    } else {
      this.hasSentRestoredSeats = true;
    }
  }

  private sendRestoredSeatsToWebSocket() {
    if (this.hasSentRestoredSeats || this.userSelectedSeatIds.size === 0) {
      return;
    }

    const seatIds = Array.from(this.userSelectedSeatIds);
    this.tableWebSocketService.sendSeatSelection(seatIds);
    this.hasSentRestoredSeats = true;
  }

  revokeSelection() {
    this.selectedSeats = [];
    this.userSelectedSeatIds.clear();
    this.selectedSeatsChange.emit(this.selectedSeats);
    this.drawCanvas();
  }

  ngOnDestroy() {
    if (this.isModal) {
      window.removeEventListener('resize', this.onWindowResize.bind(this));
    }
    if (this.roomsSubscription) {
      this.roomsSubscription.unsubscribe();
    }
    if (this.seatsSubscription) {
      this.seatsSubscription.unsubscribe();
    }
    if (this.connectionStatusSubscription) {
      this.connectionStatusSubscription.unsubscribe();
    }
    this.tableWebSocketService.close();
  }
}
