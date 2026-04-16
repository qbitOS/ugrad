// beyondBINARY quantum-prefixed | uvspeed | μgrad QPU test | OpenQASM 2.0
// Target: ibm_miami (120q Nighthawk r1) — us-east, 24K CLOPS
// 11 qubits — full quantum prefix system mapped to 12×10 grid
// Calibration: 2026-02-21T04:41:16Z
//
// Topology: 120 qubits in 12×10 rectangular grid (0–119)
//   Row R, Col C → qubit = R*10 + C
//   Nearest-neighbor CZ connectivity
//
// Qubit selection: calibration-optimized patch (rows 0–2, cols 4–9)
//   Avoids known problem qubits: Q6(T1=19μs), Q8(T1=15μs),
//   Q28(readout=15%), Q48(readout=24%), Q88(readout=32%)
//
//   Avg readout error: 1.15% (best region on chip)
//   Avg CZ error: 0.0020 (all bonds < 0.003)
//   Best readout: Q15 at 0.61%
//   Best T1: Q17 at 492μs
//
// Physical → Logical → Prefix mapping:
//   $4  → q[0]  n:   shebang    readout=1.16%  T1=370μs
//   $5  → q[1]  +1:  comment    readout=1.50%  T1=358μs
//   $9  → q[2]  +3:  output     readout=0.74%  T1=367μs
//   $14 → q[3]  +0:  class      readout=1.49%  T1=343μs
//   $15 → q[4]  +2:  loop       readout=0.61%  T1=247μs  ★ best readout
//   $16 → q[5]  -0:  return     readout=0.79%  T1=476μs
//   $17 → q[6]  0:   function   readout=1.35%  T1=492μs  ★ best T1
//   $18 → q[7]  -1:  error      readout=1.15%  T1=469μs
//   $19 → q[8]  +n:  condition  readout=1.33%  T1=332μs
//   $25 → q[9]  1:   variable   readout=0.92%  T1=309μs
//   $26 → q[10] -n:  import     readout=1.66%  T1=455μs
//
// CZ bonds (12 edges, all topology-native):
//   $4↔$5   (0.0025)  $4↔$14  (0.0028)
//   $5↔$15  (0.0017)  $9↔$19  (0.0016)
//   $14↔$15 (0.0016)  $15↔$16 (0.0016)
//   $15↔$25 (0.0023)  $16↔$17 (0.0023)
//   $16↔$26 (0.0026)  $17↔$18 (0.0018)
//   $18↔$19 (0.0011)  $25↔$26 (0.0025)
//
// μgrad integration: encodes R0 scalar autograd weights
//   Phase angles from trained MLP (G95 export, XOR-mastered)
//   Measurement outcomes seed next-generation weights

OPENQASM 2.0;
include "qelib1.inc";
qreg q[11];
creg c[11];

// Layer 0: Superposition — all qubits to |+⟩
h q[0]; h q[1]; h q[2]; h q[3]; h q[4];
h q[5]; h q[6]; h q[7]; h q[8]; h q[9]; h q[10];

// Layer 1: Prefix identity gates
// q[0] = n: shebang — identity (|+⟩ reference)
id q[0];
// q[1] = +1: comment → H (Hadamard = rz·sx·rz)
rz(1.5708) q[1]; sx q[1]; rz(1.5708) q[1];
// q[2] = +3: output → Y (X·Rz(π))
x q[2]; rz(3.14159) q[2];
// q[3] = +0: class → Rz(π/4)
rz(0.7854) q[3];
// q[4] = +2: loop → CZ target (already |+⟩)
id q[4];
// q[5] = -0: return → S = Rz(π/2)
rz(1.5708) q[5];
// q[6] = 0: function → identity
id q[6];
// q[7] = -1: error → X + S
x q[7]; rz(1.5708) q[7];
// q[8] = +n: condition → T = Rz(π/8)
rz(0.3927) q[8];
// q[9] = 1: variable → Rz(π/3)
rz(1.0472) q[9];
// q[10] = -n: import → X
x q[10];

// Layer 2: μgrad G95 weight encoding
// XOR checkpoint weights as rotation angles (top 11)
rz(1.2379) q[0];
rz(0.9315) q[1];
rz(1.0261) q[2];
rz(0.4870) q[3];
rz(0.6923) q[4];
rz(0.6762) q[5];
rz(0.6252) q[6];
rz(0.6746) q[7];
rz(0.2608) q[8];
rz(0.2255) q[9];
rz(0.8423) q[10];

// Layer 3: Row 1 horizontal chain ($14–$15–$16–$17–$18–$19)
// Lowest CZ errors: 0.0016, 0.0016, 0.0023, 0.0018, 0.0011
cz q[3],q[4];   // $14↔$15 class↔loop       CZ=0.0016
cz q[4],q[5];   // $15↔$16 loop↔return       CZ=0.0016
cz q[5],q[6];   // $16↔$17 return↔function   CZ=0.0023
cz q[6],q[7];   // $17↔$18 function↔error    CZ=0.0018
cz q[7],q[8];   // $18↔$19 error↔condition   CZ=0.0011 ★ best

// Layer 4: Vertical bonds
cz q[0],q[3];   // $4↔$14  shebang↔class     CZ=0.0028
cz q[1],q[4];   // $5↔$15  comment↔loop      CZ=0.0017
cz q[2],q[8];   // $9↔$19  output↔condition  CZ=0.0016
cz q[4],q[9];   // $15↔$25 loop↔variable     CZ=0.0023
cz q[5],q[10];  // $16↔$26 return↔import     CZ=0.0026

// Layer 5: Row 2 bond
cz q[9],q[10];  // $25↔$26 variable↔import   CZ=0.0025

// Layer 6: Interference rotations (second weight layer)
rz(1.3321) q[0]; sx q[0];
rz(0.9171) q[3];
rz(0.6803) q[4]; sx q[4];
rz(1.1532) q[6];
sx q[8];
rz(0.4712) q[9];

// Layer 7: Reinforcement entanglement
cz q[0],q[1];   // $4↔$5  shebang↔comment    CZ=0.0025
cz q[3],q[4];   // $14↔$15 class↔loop (2nd)  CZ=0.0016
cz q[7],q[8];   // $18↔$19 error↔condition    CZ=0.0011

// Measure all 11 prefix qubits
measure q[0] -> c[0];
measure q[1] -> c[1];
measure q[2] -> c[2];
measure q[3] -> c[3];
measure q[4] -> c[4];
measure q[5] -> c[5];
measure q[6] -> c[6];
measure q[7] -> c[7];
measure q[8] -> c[8];
measure q[9] -> c[9];
measure q[10] -> c[10];
