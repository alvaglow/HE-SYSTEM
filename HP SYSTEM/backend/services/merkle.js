// services/merkle.js — Merkle tree for blockchain-verifiable attendance
const { MerkleTree } = require('merkletreejs');
const crypto = require('crypto');
const { query } = require('../config/database');
const logger = require('../config/logger');

const sha256 = (data) => crypto.createHash('sha256').update(data).digest();

// Build daily Merkle tree of attendance records
const buildDailyTree = async (date) => {
  const dateStr = date || new Date().toISOString().slice(0, 10);
  const records = await query(
    `SELECT ar.id, ar.student_id, ar.session_id, ar.check_in_time, ar.status
     FROM attendance_records ar
     JOIN attendance_sessions s ON ar.session_id = s.id
     WHERE DATE(ar.check_in_time) = $1
     ORDER BY ar.check_in_time ASC`,
    [dateStr]
  );

  if (records.rows.length === 0) {
    logger.info(`[Merkle] No attendance records for ${dateStr}`);
    return null;
  }

  // Create leaf nodes: SHA256 of each record's canonical JSON
  const leaves = records.rows.map(r =>
    sha256(JSON.stringify({
      id: r.id,
      studentId: r.student_id,
      sessionId: r.session_id,
      checkInTime: r.check_in_time,
      status: r.status,
    }))
  );

  const tree = new MerkleTree(leaves, sha256, { sortPairs: true });
  const root = tree.getRoot().toString('hex');

  // Store Merkle root in database
  await query(
    `INSERT INTO daily_merkle_roots(date, root_hash, record_count, leaf_hashes)
     VALUES($1,$2,$3,$4)
     ON CONFLICT (date) DO UPDATE SET root_hash=$2, record_count=$3, leaf_hashes=$4, updated_at=NOW()`,
    [dateStr, root, records.rows.length, JSON.stringify(leaves.map(l => l.toString('hex')))]
  );

  logger.info(`[Merkle] Built tree for ${dateStr}: root=${root}, records=${records.rows.length}`);
  return { date: dateStr, rootHash: root, recordCount: records.rows.length };
};

// Generate proof for a single attendance record
const generateProof = async (attendanceId) => {
  const rec = await query(
    `SELECT ar.*, s.session_date FROM attendance_records ar
     JOIN attendance_sessions s ON ar.session_id=s.id
     WHERE ar.id=$1`,
    [attendanceId]
  );
  if (!rec.rows[0]) throw new Error('Record not found');

  const dateStr = new Date(rec.rows[0].check_in_time).toISOString().slice(0, 10);
  const rootRec = await query(
    `SELECT root_hash, leaf_hashes FROM daily_merkle_roots WHERE date=$1`, [dateStr]
  );
  if (!rootRec.rows[0]) throw new Error('Merkle tree not yet built for this date');

  // Find the leaf for this record
  const leafHash = sha256(JSON.stringify({
    id: rec.rows[0].id,
    studentId: rec.rows[0].student_id,
    sessionId: rec.rows[0].session_id,
    checkInTime: rec.rows[0].check_in_time,
    status: rec.rows[0].status,
  })).toString('hex');

  const allLeaves = rootRec.rows[0].leaf_hashes.map(h => Buffer.from(h, 'hex'));
  const tree = new MerkleTree(allLeaves, sha256, { sortPairs: true });
  const leafBuf = Buffer.from(leafHash, 'hex');
  const proof = tree.getProof(leafBuf).map(p => ({
    position: p.position,
    data: p.data.toString('hex'),
  }));

  return {
    attendanceId,
    date: dateStr,
    leafHash,
    proof,
    rootHash: rootRec.rows[0].root_hash,
    verifiable: `Verify: merkle.verify(proof, leaf="${leafHash}", root="${rootRec.rows[0].root_hash}")`,
  };
};

// Verify a proof (can be called by any party)
const verifyProof = (leaf, proof, root) => {
  const leafBuf = Buffer.from(leaf, 'hex');
  const proofBufs = proof.map(p => ({ position: p.position, data: Buffer.from(p.data, 'hex') }));
  const rootBuf = Buffer.from(root, 'hex');
  // Reconstruct tree and verify
  const computed = proofBufs.reduce((hash, { position, data }) => {
    const pair = position === 'left' ? [data, hash] : [hash, data];
    return sha256(Buffer.concat(pair));
  }, sha256(leafBuf));
  return computed.toString('hex') === root;
};

module.exports = { buildDailyTree, generateProof, verifyProof };
