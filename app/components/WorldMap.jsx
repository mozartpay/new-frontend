import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Html } from '@react-three/drei';

// Helper function for currency conversion
const getExchangeRate = (fromCurrency, toCurrency) => {
  const rates = {
    USD: 1,
    EUR: 0.92,
    GBP: 0.79,
    JPY: 151.45,
    AUD: 1.53,
    CAD: 1.36,
    COP: 0.00026,
    RUB: 0.016,
    BRL: 0.17,
    AED: 0.27,
    KES: 0.0067,
    CNY: 0.14,
    ARS: 0.0028,
    VES: 0.00003,
    MXN: 0.055,
    CLP: 0.0011,
    NGN: 0.0013,
    ZAR: 0.052,
    MAD: 0.098,
    KRW: 0.00074,
    TRY: 0.036
  };
  
  if (!rates[fromCurrency] || !rates[toCurrency]) return 1;
  return (rates[toCurrency] / rates[fromCurrency]).toFixed(2);
};

// Component for individual map nodes
export function MapNode({ position, color = '#ffffff' }) {
  return (
    <mesh position={position}>
      <sphereGeometry args={[0.02, 16, 16]} />
      <meshBasicMaterial color={color} />
    </mesh>
  );
}

// Add this new component for particle trails
function ParticleTrail({ positions, color = "#1a237e" }) {
  const trailLength = 15; // Reduced from 20 for better performance
  const trailPositions = useMemo(() => positions.slice(-trailLength * 3), [positions]);
  const [colors, opacities] = useMemo(() => {
    const colors = new Float32Array(trailPositions.length * 3);
    const opacities = new Float32Array(trailPositions.length);
    
    const colorObj = new THREE.Color(color);
    
    for (let i = 0; i < trailPositions.length / 3; i++) {
      const alpha = i / (trailPositions.length / 3);
      colors[i * 3] = colorObj.r;
      colors[i * 3 + 1] = colorObj.g;
      colors[i * 3 + 2] = colorObj.b;
      opacities[i] = alpha;
    }
    return [colors, opacities];
  }, [trailPositions.length, color]);

  return (
    <line>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={trailPositions.length / 3}
          array={new Float32Array(trailPositions)}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={trailPositions.length / 3}
          array={colors}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-opacity"
          count={trailPositions.length / 3}
          array={opacities}
          itemSize={1}
        />
      </bufferGeometry>
      <lineBasicMaterial
        vertexColors
        transparent
        opacity={0.8}
        linewidth={1}
      />
    </line>
  );
}

// Modified PaymentParticle component
function PaymentParticle({ startPosition, endPosition, speed = 0.02, currency: fromCurrency, endCurrency }) {
  const particleRef = useRef();
  const [progress, setProgress] = useState(0);
  const [positions, setPositions] = useState([]);
  const velocityRef = useRef(new THREE.Vector3());
  const positionRef = useRef(new THREE.Vector3());
  const maxTrailLength = 30; // Reduced from 50

  // Add conversion display state
  const [showConversion, setShowConversion] = useState(false);
  const exchangeRate = useMemo(() => 
    getExchangeRate(fromCurrency, endCurrency),
    [fromCurrency, endCurrency]
  );

  // Memoize calculation values
  const { rotationAxis, angle } = useMemo(() => ({
    angle: startPosition.angleTo(endPosition),
    rotationAxis: new THREE.Vector3().crossVectors(startPosition, endPosition).normalize()
  }), [startPosition, endPosition]);

  useFrame((state, delta) => {
    if (progress < 1) {
      const newProgress = progress + speed;
      setProgress(newProgress);
      
      // Show conversion effect at midpoint
      if (newProgress > 0.45 && newProgress < 0.55) {
        setShowConversion(true);
      } else {
        setShowConversion(false);
      }

      // Calculate position using refs to avoid garbage collection
      positionRef.current.copy(startPosition);
      positionRef.current.applyAxisAngle(rotationAxis, angle * newProgress);
      
      const radius = 2;
      const heightOffset = Math.sin(newProgress * Math.PI) * 0.5; // Reduced multiplier
      positionRef.current.normalize().multiplyScalar(radius + heightOffset);
      
      if (particleRef.current) {
        const oldPos = particleRef.current.position;
        velocityRef.current.subVectors(positionRef.current, oldPos).multiplyScalar(0.95);
        positionRef.current.add(velocityRef.current);
        particleRef.current.position.copy(positionRef.current);
      }

      // Update positions more efficiently
      setPositions(prev => {
        const newPositions = [...prev, positionRef.current.x, positionRef.current.y, positionRef.current.z];
        return newPositions.length > maxTrailLength * 3 
          ? newPositions.slice(-maxTrailLength * 3) 
          : newPositions;
      });
    }
  });

  return (
    <>
      <mesh ref={particleRef} position={startPosition}>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshBasicMaterial color={showConversion ? "#4CAF50" : "#1a237e"} />
        <Html
          center
          style={{
            transform: 'scale(1.5)',
            pointerEvents: 'none'
          }}
        >
          <div style={{
            color: '#ffffff',
            background: showConversion ? 'rgba(76, 175, 80, 0.8)' : 'rgba(26, 35, 126, 0.8)',
            padding: '1px 4px',
            borderRadius: '2px',
            fontSize: '6px',
            fontFamily: 'Arial',
            whiteSpace: 'nowrap'
          }}>
            {showConversion ? 
              `1 ${fromCurrency} = ${exchangeRate} ${endCurrency}` :
              progress < 0.5 ? fromCurrency : endCurrency
            }
          </div>
        </Html>
      </mesh>
      {positions.length > 0 && (
        <ParticleTrail 
          positions={positions} 
          color={showConversion ? "#4CAF50" : "#1a237e"}
        />
      )}
    </>
  );
}

// Simplified CityLabel component without mouse-over effects
function CityLabel({ position, name }) {
  const textRef = useRef();
  
  useFrame(({ camera }) => {
    if (textRef.current) {
      // Only keep the camera-facing behavior
      textRef.current.lookAt(camera.position);
    }
  });

  return (
    <group position={position}>
      <group ref={textRef} position={[0, 0.15, 0]}>
        <Html
          center
          style={{
            transform: 'scale(1.5)',
            pointerEvents: 'none'
          }}
        >
          <div style={{
            color: '#ffffff',
            background: 'rgba(0, 0, 0, 0.5)',
            padding: '2px 6px',
            borderRadius: '4px',
            fontSize: '8px',
            fontFamily: 'Arial',
            whiteSpace: 'nowrap',
            textShadow: '0 1px 4px rgba(0,0,0,0.5)'
          }}>
            {name}
          </div>
        </Html>
      </group>
    </group>
  );
}

// Separate the 3D content into its own component
function Globe() {
  const groupRef = useRef();
  const rotationRef = useRef(0);
  const [nodes, setNodes] = useState([]);
  const [payments, setPayments] = useState([]);

  // Optimize rotation using delta time with slower speed
  useFrame((state, delta) => {
    if (groupRef.current) {
      rotationRef.current -= delta * 0.1; // Changed from += to -= for correct direction
      groupRef.current.rotation.y = rotationRef.current;
    }
  });

  // Updated world map coordinates with precise city locations
  useEffect(() => {
    const worldMapCoordinates = [
      { name: 'New York', lat: 40.712776, lng: -74.005974, currency: 'USD' },
      { name: 'London', lat: 51.507351, lng: -0.127758, currency: 'GBP' },
      { name: 'Tokyo', lat: 35.652832, lng: 139.839478, currency: 'JPY' },
      { name: 'Bogota', lat: 4.624335, lng: -74.063644, currency: 'COP' },
      { name: 'Vienna', lat: 48.208174, lng: 16.373819, currency: 'EUR' },
      { name: 'Sydney', lat: -33.868820, lng: 151.209290, currency: 'AUD' },
      { name: 'Berlin', lat: 52.520008, lng: 13.404954, currency: 'EUR' },
      { name: 'Paris', lat: 48.856613, lng: 2.352222, currency: 'EUR' },
      { name: 'Moscow', lat: 55.755825, lng: 37.617298, currency: 'RUB' },
      { name: 'Brasilia', lat: -15.780147, lng: -47.929169, currency: 'BRL' },
      { name: 'Rome', lat: 41.902782, lng: 12.496365, currency: 'EUR' },
      { name: 'Dubai', lat: 25.204849, lng: 55.270782, currency: 'AED' },
      { name: 'Nairobi', lat: -1.292066, lng: 36.821946, currency: 'KES' },
      { name: 'Shanghai', lat: 31.230391, lng: 121.473701, currency: 'CNY' },
      { name: 'Buenos Aires', lat: -34.603683, lng: -58.381557, currency: 'ARS' },
      { name: 'Caracas', lat: 10.480594, lng: -66.903603, currency: 'VES' },
      { name: 'Mexico City', lat: 19.432608, lng: -99.133209, currency: 'MXN' },
      { name: 'Santiago', lat: -33.448891, lng: -70.669266, currency: 'CLP' },
      { name: 'Lagos', lat: 6.524379, lng: 3.379206, currency: 'NGN' },
      { name: 'Johannesburg', lat: -26.204103, lng: 28.047304, currency: 'ZAR' },
      { name: 'Casablanca', lat: 33.573110, lng: -7.589843, currency: 'MAD' },
      { name: 'Ottawa', lat: 45.421530, lng: -75.697193, currency: 'CAD' },
      { name: 'Dublin', lat: 53.349805, lng: -6.260310, currency: 'EUR' },
      { name: 'Seoul', lat: 37.566536, lng: 126.977966, currency: 'KRW' },
      { name: 'Ankara', lat: 39.933365, lng: 32.859741, currency: 'TRY' }
      
      
    ];

    // Convert lat/lng to 3D coordinates
    const radius = 2; // This should match your sphere radius
    const points = worldMapCoordinates.map(({ lat, lng, name, currency }) => {
      // Convert latitude and longitude to radians
      const latRad = (90 - lat) * (Math.PI / 180);
      const lngRad = (180 + lng) * (Math.PI / 180);
      
      // Convert to Cartesian coordinates
      const x = -(radius * Math.sin(latRad) * Math.cos(lngRad));
      const y = radius * Math.cos(latRad);
      const z = radius * Math.sin(latRad) * Math.sin(lngRad);
      
      return {
        position: new THREE.Vector3(x, y, z),
        name,
        currency
      };
    });

    setNodes(points);
  }, []);

  // Optimize payment creation
  useEffect(() => {
    const createNewPayment = () => {
      if (nodes.length < 2) return;

      const startIndex = Math.floor(Math.random() * nodes.length);
      let endIndex;
      do {
        endIndex = Math.floor(Math.random() * nodes.length);
      } while (endIndex === startIndex);

      const payment = {
        id: Date.now(),
        start: nodes[startIndex],
        end: nodes[endIndex],
        speed: 0.003,
        currency: nodes[startIndex].currency,
        endCurrency: nodes[endIndex].currency
      };

      setPayments(prev => [...prev.slice(-22), payment]);

      setTimeout(() => {
        setPayments(prev => prev.filter(p => p.id !== payment.id));
      }, 10000);
    };

    const interval = setInterval(createNewPayment, 1333); // Reduced from 2000ms to ~1333ms (2000/1.5)
    return () => clearInterval(interval);
  }, [nodes]);

  return (
    <group ref={groupRef}>
      {/* Base sphere */}
      <mesh>
        <sphereGeometry args={[2, 32, 32]} />
        <meshBasicMaterial color="#1a237e" wireframe />
      </mesh>
      
      {/* City nodes and labels */}
      {nodes.map((node, index) => (
        <group key={index}>
          <MapNode position={node.position} color="#ff4444" />
          <CityLabel position={node.position} name={node.name} />
        </group>
      ))}
      
      {/* Payments and pulses */}
      {payments.map(payment => (
        <PaymentParticle
          key={payment.id}
          startPosition={payment.start.position}
          endPosition={payment.end.position}
          speed={payment.speed}
          currency={payment.currency}
          endCurrency={payment.endCurrency}
        />
      ))}
    </group>
  );
}

// Main WorldMap component that provides the Canvas
export function WorldMap() {
  const [dpr, setDpr] = useState(1);

  // Use useEffect to set dpr on client-side only
  useEffect(() => {
    setDpr(typeof window !== 'undefined' ? window.devicePixelRatio : 1);
  }, []);

  return (
    <div style={{ 
      position: 'absolute',
      right: 0,
      width: '200%',
      height: '100vh',
      zIndex: -1
    }}>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 60 }}
        dpr={dpr} // Use state value instead of direct window access
        style={{ background: 'transparent' }}
        frameloop="always"
        performance={{ min: 0.5 }}
      >
        <Globe />
      </Canvas>
    </div>
  );
}

export default WorldMap; 