/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { GrabState } from '../types';

interface GrabZoneProps {
  cursorGrabbed: boolean;
  gameOver: boolean;
  onCursorGrabbed: () => void;
  mousePos: { x: number; y: number };
  onMetricsUpdate?: (state: GrabState, rotation: number, isExtended: boolean) => void;
}

const ASSETS = {
  head: "https://s3-us-west-2.amazonaws.com/s.cdpn.io/184729/head.svg",
  waiting: "https://s3-us-west-2.amazonaws.com/s.cdpn.io/184729/hand.svg",
  stalking: "https://s3-us-west-2.amazonaws.com/s.cdpn.io/184729/hand-waiting.svg",
  grabbing: "https://s3-us-west-2.amazonaws.com/s.cdpn.io/184729/hand.svg",
  grabbed: "https://s3-us-west-2.amazonaws.com/s.cdpn.io/184729/hand-with-cursor.svg",
  shaka: "https://s3-us-west-2.amazonaws.com/s.cdpn.io/184729/hand-surfs-up.svg",
};

export function GrabZone({ cursorGrabbed, gameOver, onCursorGrabbed, mousePos, onMetricsUpdate }: GrabZoneProps) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const armRef = useRef<HTMLDivElement>(null);

  const [outerHovered, setOuterHovered] = useState(false);
  const [innerHovered, setInnerHovered] = useState(false);
  const [isExtended, setExtendedArm] = useState(false);
  const [rotation, setRotation] = useState(0);

  // Derive current status/state based on visual interaction triggers
  let state: GrabState = 'waiting';
  if (outerHovered) state = 'stalking';
  if (innerHovered) state = 'grabbing';
  if (cursorGrabbed) state = 'grabbed';
  if (gameOver) state = 'shaka';

  // Fire metric changes up to parent component
  useEffect(() => {
    if (onMetricsUpdate) {
      onMetricsUpdate(state, rotation, isExtended);
    }
  }, [state, rotation, isExtended]);

  // Trigger arm extension phase when in dynamic grabbing state
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (state === 'grabbing') {
      timer = setTimeout(() => {
        setExtendedArm(true);
      }, 1200);
    } else {
      setExtendedArm(false);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [state]);

  // Track coordinates of the arm rotation origin to compute rotation angle
  useEffect(() => {
    if (!armRef.current || gameOver || stageGrabbed()) return;

    const computeRotation = () => {
      const rect = armRef.current?.getBoundingClientRect();
      if (!rect) return;

      const anchorX = rect.left + rect.width * 0.5;
      const anchorY = rect.top + rect.height * 0.5;

      const deltaX = mousePos.x - anchorX;
      const deltaY = mousePos.y - anchorY;

      // Calculate angle relative to upward vector
      const angleRad = Math.atan2(deltaX, -deltaY);
      const angleDeg = angleRad * (180 / Math.PI);

      // Clamp rotation for visual authenticity so the arm doesn't look dislocated
      const clampedRotation = Math.min(Math.max(Math.round(angleDeg), -78), 78);
      setRotation(clampedRotation);
    };

    computeRotation();
  }, [mousePos, gameOver, cursorGrabbed]);

  // Helper check
  function stageGrabbed() {
    return state === 'grabbed';
  }

  // Monitor element level mouse events
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!outerRef.current) return;
      const outerRect = outerRef.current.getBoundingClientRect();
      const inOuter =
        e.clientX >= outerRect.left &&
        e.clientX <= outerRect.right &&
        e.clientY >= outerRect.top &&
        e.clientY <= outerRect.bottom;
      setOuterHovered(inOuter);

      if (!innerRef.current) return;
      const innerRect = innerRef.current.getBoundingClientRect();
      const inInner =
        e.clientX >= innerRect.left &&
        e.clientX <= innerRect.right &&
        e.clientY >= innerRect.top &&
        e.clientY <= innerRect.bottom;
      setInnerHovered(inInner);
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
    };
  }, []);

  // Preload graphic image assets as recommended
  useEffect(() => {
    Object.values(ASSETS).forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  const grabberClass = `grabber grabber--${state} ${isExtended ? 'grabber--extended' : ''}`;
  const wrapperStyle = { transform: `rotate(${gameOver ? 0 : rotation}deg)` };
  const handImageSrc = ASSETS[state];

  return (
    <div className="grab-zone" ref={outerRef} id="interactive-grab-zone">
      {/* Target Trigger Zone */}
      <div className="grab-zone__danger" ref={innerRef} id="danger-trigger-box">
        <div className={grabberClass} id="cute-creature-entity">
          <div className="grabber__body" id="creature-hatch" />
          <img
            className="grabber__face"
            src={ASSETS.head}
            alt="Monster Head"
            referrerPolicy="no-referrer"
            id="creature-head"
          />
          <div className="grabber__arm-wrapper" ref={armRef} style={wrapperStyle} id="rotating-shoulder-joint">
            <div className="grabber__arm" id="scaly-arm-body">
              <img
                className="grabber__hand"
                src={handImageSrc}
                alt="Monster Hand Claw"
                referrerPolicy="no-referrer"
                onMouseEnter={() => {
                  if (state !== 'grabbed' && state !== 'shaka') {
                    onCursorGrabbed();
                  }
                }}
                id="interactive-claw"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
