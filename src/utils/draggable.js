import { saveComponentPosition, getSettings } from "../services/state.js";

export function makeDraggable(element, componentId, onDragEndCallback = null, handleSelector = '.drag-handle') {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    const settings = getSettings();
    const savedPos = settings.componentPositions?.[componentId];

    if (savedPos) {
        element.style.top = savedPos.top;
        element.style.left = savedPos.left;
        element.style.bottom = 'auto';
        element.style.right = 'auto';
        if (savedPos.transform) element.style.transform = savedPos.transform;
    }

    // Use the provided handleSelector or default to the entire element
    const handle = element.querySelector(handleSelector) || element;
    handle.style.cursor = 'move';

    // Attach mousedown listener to the handle
    handle.onmousedown = dragMouseDown;

    function dragMouseDown(e) {
        e = e || window.event;
        
        // If the click target is an interactive element (button, input, etc.)
        // and it's not explicitly the 'drag-handle' icon itself, prevent dragging.
        // This is to allow interaction with buttons/inputs within the header/handle.
        const targetTagName = e.target.tagName;
        const isInteractiveElement = ['INPUT', 'BUTTON', 'A', 'SELECT', 'OPTION', 'TEXTAREA'].includes(targetTagName);
        const isCloseButton = e.target.classList.contains('close') || e.target.closest('.close');
        
        // Allow dragging on the specific .drag-handle icon always
        // If the element clicked is interactive and not the specific drag-handle or close button, prevent drag
        if (isInteractiveElement && !e.target.classList.contains('drag-handle') && !isCloseButton) {
            return;
        }

        e.preventDefault(); // Prevent default text selection, etc.
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
        element.classList.add('dragging');
        
        // Ensure positioning is ready for top/left updates
        element.style.bottom = 'auto';
        element.style.right = 'auto';
    }

    function elementDrag(e) {
        e = e || window.event;
        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        
        let newTop = (element.offsetTop - pos2);
        let newLeft = (element.offsetLeft - pos1);

        // Keep within bounds
        const bounds = {
            maxTop: window.innerHeight - element.offsetHeight,
            maxLeft: window.innerWidth - element.offsetWidth
        };

        newTop = Math.max(0, Math.min(newTop, bounds.maxTop));
        newLeft = Math.max(0, Math.min(newLeft, bounds.maxLeft));
        
        element.style.top = newTop + "px";
        element.style.left = newLeft + "px";
        element.style.bottom = 'auto';
        element.style.right = 'auto';
        element.style.margin = '0';
        element.style.transform = 'none'; // Essential: clear the translate(-50%) logic
    }

    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
        element.classList.remove('dragging');
        
        // Save position
        saveComponentPosition(componentId, {
            top: element.style.top,
            left: element.style.left,
            transform: element.style.transform
        });

        if (onDragEndCallback) {
            onDragEndCallback(element);
        }
    }
}
