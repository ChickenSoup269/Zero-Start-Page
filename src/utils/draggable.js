import { saveComponentPosition, getSettings } from "../services/state.js";

export function makeDraggable(element, componentId) {
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

    // Header or the element itself can be the handle
    const handle = element.querySelector('.drag-handle') || element;
    handle.style.cursor = 'move';
    handle.onmousedown = dragMouseDown;

    function dragMouseDown(e) {
        e = e || window.event;
        // Check if clicking on an input or button
        if (['INPUT', 'BUTTON', 'I', 'A', 'SELECT', 'OPTION'].includes(e.target.tagName)) return;
        
        e.preventDefault();
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
    }
}
