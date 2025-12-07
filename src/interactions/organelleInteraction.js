import * as THREE from 'three';

// ============================================
// UNIFIED ORGANELLE INTERACTION SYSTEM
// ============================================

/**
 * OrganelleInteractionManager
 * Handles click detection, hover effects, and info popups for organelles
 */
export class OrganelleInteractionManager {
  constructor(camera, renderer, options = {}) {
    this.camera = camera;
    this.renderer = renderer;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.clickableMeshes = [];
    this.organelleInfo = {};
    this.activeOrganelle = null;
    this.enabled = true;

    // Configuration
    this.config = {
      accentColor: options.accentColor || '#14b8a6', // teal-500 default
      popupOffset: options.popupOffset || { x: 20, y: -20 },
      ...options
    };

    // Create popup element
    this.popup = this._createPopup();

    // Bind event handlers
    this._onClick = this._onClick.bind(this);
    this._onMouseMove = this._onMouseMove.bind(this);

    // Add event listeners
    this.renderer.domElement.addEventListener('click', this._onClick);
    this.renderer.domElement.addEventListener('mousemove', this._onMouseMove);
  }

  /**
   * Create the popup DOM element
   */
  _createPopup() {
    const popup = document.createElement('div');
    popup.id = 'organelle-popup';
    popup.className = 'fixed z-50 hidden';
    popup.innerHTML = `
      <div class="glass-strong rounded-xl p-4 max-w-sm shadow-xl" style="background: rgba(15, 23, 42, 0.95); backdrop-filter: blur(16px); border: 1px solid rgba(255,255,255,0.1);">
        <div class="flex justify-between items-start mb-2">
          <div>
            <h3 id="popup-title" class="text-lg font-bold" style="color: ${this.config.accentColor};">Organelle Name</h3>
            <p id="popup-subtitle" class="text-xs text-slate-400">Subtitle</p>
          </div>
          <button id="popup-close" class="p-1 hover:bg-slate-700/50 rounded transition-colors">
            <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <p id="popup-description" class="text-sm text-slate-300 leading-relaxed"></p>
        <div id="popup-function" class="mt-3 pt-3 border-t border-slate-700/50 hidden">
          <p class="text-xs text-slate-400 mb-1">Function</p>
          <p id="popup-function-text" class="text-sm text-slate-300"></p>
        </div>
      </div>
    `;

    document.body.appendChild(popup);

    // Add close handler
    const closeBtn = popup.querySelector('#popup-close');
    closeBtn.addEventListener('click', () => this.hidePopup());

    return popup;
  }

  /**
   * Register organelle info data
   */
  setOrganelleInfo(info) {
    this.organelleInfo = info;
  }

  /**
   * Add a mesh to the clickable list
   */
  addClickable(mesh, organelleName) {
    mesh.userData.organelle = organelleName;
    if (!this.clickableMeshes.includes(mesh)) {
      this.clickableMeshes.push(mesh);
    }
  }

  /**
   * Add multiple meshes from a group
   */
  addClickableGroup(group, organelleName) {
    group.traverse((child) => {
      if (child.isMesh) {
        this.addClickable(child, organelleName);
      }
    });
  }

  /**
   * Remove a mesh from clickable list
   */
  removeClickable(mesh) {
    const index = this.clickableMeshes.indexOf(mesh);
    if (index > -1) {
      this.clickableMeshes.splice(index, 1);
    }
  }

  /**
   * Handle click events
   */
  _onClick(event) {
    if (!this.enabled) return;

    // Calculate mouse position
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // Raycast
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.clickableMeshes, true);

    if (intersects.length > 0) {
      // Find the organelle name
      let organelleName = null;
      let obj = intersects[0].object;

      while (obj && !organelleName) {
        if (obj.userData && obj.userData.organelle) {
          organelleName = obj.userData.organelle;
        }
        obj = obj.parent;
      }

      if (organelleName) {
        this.showPopup(organelleName, event.clientX, event.clientY);
      }
    } else {
      this.hidePopup();
    }
  }

  /**
   * Handle mouse move for cursor changes
   */
  _onMouseMove(event) {
    if (!this.enabled) return;

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.clickableMeshes, true);

    if (intersects.length > 0) {
      this.renderer.domElement.style.cursor = 'pointer';
    } else {
      this.renderer.domElement.style.cursor = 'default';
    }
  }

  /**
   * Show popup for an organelle
   */
  showPopup(organelleName, x, y) {
    const info = this.organelleInfo[organelleName];
    if (!info) {
      console.warn(`No info found for organelle: ${organelleName}`);
      return;
    }

    this.activeOrganelle = organelleName;

    // Update popup content
    const title = this.popup.querySelector('#popup-title');
    const subtitle = this.popup.querySelector('#popup-subtitle');
    const description = this.popup.querySelector('#popup-description');
    const functionDiv = this.popup.querySelector('#popup-function');
    const functionText = this.popup.querySelector('#popup-function-text');

    title.textContent = info.title || info.name || organelleName;
    title.style.color = info.color || this.config.accentColor;

    subtitle.textContent = info.subtitle || '';
    subtitle.style.display = info.subtitle ? 'block' : 'none';

    description.textContent = info.description || '';

    if (info.function) {
      functionDiv.classList.remove('hidden');
      functionText.textContent = info.function;
    } else {
      functionDiv.classList.add('hidden');
    }

    // Position popup
    const popupRect = this.popup.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let posX = x + this.config.popupOffset.x;
    let posY = y + this.config.popupOffset.y;

    // Prevent going off screen
    if (posX + 320 > viewportWidth) {
      posX = x - 340;
    }
    if (posY + 200 > viewportHeight) {
      posY = viewportHeight - 220;
    }
    if (posY < 20) {
      posY = 20;
    }

    this.popup.style.left = `${posX}px`;
    this.popup.style.top = `${posY}px`;
    this.popup.classList.remove('hidden');
  }

  /**
   * Hide the popup
   */
  hidePopup() {
    this.popup.classList.add('hidden');
    this.activeOrganelle = null;
  }

  /**
   * Check if popup is visible
   */
  isPopupVisible() {
    return !this.popup.classList.contains('hidden');
  }

  /**
   * Enable/disable interaction
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) {
      this.hidePopup();
      this.renderer.domElement.style.cursor = 'default';
    }
  }

  /**
   * Update accent color
   */
  setAccentColor(color) {
    this.config.accentColor = color;
    const title = this.popup.querySelector('#popup-title');
    if (title && !this.organelleInfo[this.activeOrganelle]?.color) {
      title.style.color = color;
    }
  }

  /**
   * Clean up event listeners
   */
  dispose() {
    this.renderer.domElement.removeEventListener('click', this._onClick);
    this.renderer.domElement.removeEventListener('mousemove', this._onMouseMove);
    if (this.popup.parentNode) {
      this.popup.parentNode.removeChild(this.popup);
    }
  }
}

// ============================================
// STANDARD ORGANELLE INFO TEMPLATES
// ============================================

export const STANDARD_ORGANELLE_INFO = {
  Nucleus: {
    name: 'Nucleus',
    title: 'Nucleus',
    subtitle: 'Command Center',
    description: 'The nucleus contains the cell\'s genetic material (DNA) and controls gene expression. It\'s surrounded by a double membrane with nuclear pores for transport.',
    function: 'Stores DNA and coordinates cell activities including growth, metabolism, and reproduction.',
    color: '#a855f7' // purple
  },
  Mitochondria: {
    name: 'Mitochondria',
    title: 'Mitochondria',
    subtitle: 'Powerhouse of the Cell',
    description: 'Double-membrane organelles that generate most of the cell\'s ATP through oxidative phosphorylation. The inner membrane forms cristae to maximize surface area.',
    function: 'Convert nutrients into ATP energy through cellular respiration.',
    color: '#ef4444' // red
  },
  Golgi: {
    name: 'Golgi Apparatus',
    title: 'Golgi Apparatus',
    subtitle: 'Packaging Center',
    description: 'A stack of flattened membrane sacs that modify, sort, and package proteins for secretion or use within the cell. Consists of cis, medial, and trans compartments.',
    function: 'Process and package proteins and lipids for transport.',
    color: '#fbbf24' // amber
  },
  RER: {
    name: 'Rough ER',
    title: 'Rough Endoplasmic Reticulum',
    subtitle: 'Protein Factory',
    description: 'A network of membrane-enclosed sacs studded with ribosomes. Synthesizes proteins destined for secretion or membrane insertion.',
    function: 'Synthesize proteins that will be secreted or embedded in membranes.',
    color: '#14b8a6' // teal
  },
  Lysosomes: {
    name: 'Lysosomes',
    title: 'Lysosomes',
    subtitle: 'Recycling Centers',
    description: 'Membrane-bound organelles containing digestive enzymes that break down waste materials, cellular debris, and foreign substances.',
    function: 'Digest and recycle cellular waste and foreign materials.',
    color: '#22c55e' // green
  },
  Centrioles: {
    name: 'Centrioles',
    title: 'Centrioles',
    subtitle: 'Organizing Centers',
    description: 'Cylindrical structures made of microtubules that help organize the mitotic spindle during cell division and anchor the cytoskeleton.',
    function: 'Organize microtubules and assist in cell division.',
    color: '#ec4899' // pink
  },
  Ribosomes: {
    name: 'Ribosomes',
    title: 'Ribosomes',
    subtitle: 'Protein Builders',
    description: 'Molecular machines that read mRNA and assemble amino acids into proteins. Found free in cytoplasm or attached to rough ER.',
    function: 'Translate mRNA code into proteins.',
    color: '#94a3b8' // slate
  },
  Vesicles: {
    name: 'Vesicles',
    title: 'Transport Vesicles',
    subtitle: 'Cellular Delivery System',
    description: 'Small membrane-enclosed sacs that transport materials between organelles or to/from the cell surface.',
    function: 'Transport proteins and other molecules within the cell.',
    color: '#fbbf24' // amber
  }
};

/**
 * Create cell-specific info by merging with standard templates
 */
export function createOrganelleInfo(customInfo, useStandard = true) {
  if (!useStandard) return customInfo;

  return {
    ...STANDARD_ORGANELLE_INFO,
    ...customInfo
  };
}
