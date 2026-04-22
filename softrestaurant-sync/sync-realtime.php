<?php
/**
 * BONIFACIOS SYNC FINAL - CORREGIDO
 * - Usa CONVERT 120 para evitar el error 22007
 * - EnvÃ­a correctamente las mesas abiertas (TempCheques)
 */
error_reporting(E_ALL & ~E_DEPRECATED & ~E_NOTICE);
date_default_timezone_set('America/Hermosillo');

define('API_URL',       'https://bonifaciossancarlos.com/api/softrestaurant/sync.php');
define('API_KEY',       'bonifacios-sr-sync-2024-secret-key');
define('SR_DSN',        "sqlsrv:Server=100.84.227.35\\NATIONALSOFT;Database=softrestaurant8pro;Encrypt=false;TrustServerCertificate=true;LoginTimeout=30");
define('SR_USER',       'usuario_web');
define('SR_PASS',       'Filipenses4:8@');

class SyncFinal {
    private $conn = null;

    public function __construct() {
        echo "=== Bonifacio's Sync Tiempo Real ===\n";
    }

    private function connect(): bool {
        try {
            $this->conn = new PDO(SR_DSN, SR_USER, SR_PASS, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
            ]);
            return true;
        } catch (Throwable $e) {
            echo "ERROR conexion: " . $e->getMessage() . "\n";
            return false;
        }
    }

    private function syncToday(): void {
        try {
            $h = (int)date('H');
            $shiftDate  = ($h < 8) ? date('Y-m-d', strtotime('-1 day')) : date('Y-m-d');
            $todayStart = $shiftDate . ' 08:00:00';
            $todayEnd   = date('Y-m-d', strtotime($shiftDate . ' +1 day')) . ' 07:59:59';

            echo "[HOY] Turno: $todayStart - $todayEnd\n";

            // 1. TICKETS CERRADOS
            $sqlClosed = "
                SELECT c.folio, c.numcheque, c.fecha,
                       ISNULL(c.total,0) as total, ISNULL(c.subtotal,0) as subtotal,
                       ISNULL(c.totalimpuesto1,0) as impuesto, ISNULL(c.propina,0) as propina,
                       ISNULL(c.descuentoimporte,0) as descuento, c.nopersonas, c.pagado,
                       c.idmesero, m.nombre AS nombre_mesero, c.mesa,
                       ISNULL(c.efectivo,0) as efectivo, ISNULL(c.tarjeta,0) as tarjeta,
                       ISNULL(c.vales,0) as vales, ISNULL(c.otros,0) as otros
                FROM cheques c
                LEFT JOIN meseros m ON c.idmesero = m.idmesero
                WHERE c.cancelado = 0 AND c.pagado = 1
                AND c.fecha >= CONVERT(DATETIME, '$todayStart', 120)
                AND c.fecha <= CONVERT(DATETIME, '$todayEnd', 120)";
            
            $closed = $this->conn->query($sqlClosed)->fetchAll();

            // 2. TICKETS ABIERTOS
            $sqlOpen = "
                SELECT t.folio, t.folio AS numcheque, t.fecha,
                       ISNULL(t.total,0) AS total, ISNULL(t.subtotal,0) AS subtotal,
                       ISNULL(t.totalimpuesto1,0) AS impuesto, ISNULL(t.propina,0) AS propina,
                       ISNULL(t.descuentoimporte,0) AS descuento, t.nopersonas, 0 as pagado,
                       t.idmesero, m.nombre AS nombre_mesero, t.mesa,
                       0 as efectivo, 0 as tarjeta, 0 as vales, 0 as otros
                FROM tempcheques t
                LEFT JOIN meseros m ON t.idmesero = m.idmesero
                WHERE NOT EXISTS (SELECT 1 FROM cheques c WHERE c.folio = t.folio)";
            
            $open = $this->conn->query($sqlOpen)->fetchAll();
            $rows = array_merge($closed, $open);

            if (count($rows) === 0) {
                echo "Sin ventas en este turno.\n";
                return;
            }

            $data = [];
            foreach ($rows as $r) {
                $dt = new DateTime($r['fecha']);
                $dtStr = $dt->format('Y-m-d H:i:s');
                $isPaid = intval($r['pagado']) === 1;
                
                $ef = floatval($r['efectivo']); $ta = floatval($r['tarjeta']);
                $va = floatval($r['vales']);    $ot = floatval($r['otros']);
                
                if (!$isPaid) { $pType = 'pending'; }
                else {
                    $n = ($ef>0?1:0)+($ta>0?1:0)+($va>0?1:0)+($ot>0?1:0);
                    if ($n>1) $pType='mixed'; elseif($ta>0) $pType='card';
                    elseif($va>0) $pType='voucher'; elseif($ot>0) $pType='transfer';
                    else $pType='cash';
                }

                $tid = trim(str_replace(["\r","\n","\t"],'', (string)($r['folio'])));
                
                $data[] = [
                    'sr_ticket_id'   => $tid,
                    'ticket_number'  => (string)($r['numcheque']),
                    'folio'          => (string)($r['numcheque']),
                    'sale_date'      => $dt->format('Y-m-d'),
                    'sale_time'      => $dt->format('H:i:s'),
                    'sale_datetime'  => $dtStr,
                    'total'          => floatval($r['total']),
                    'subtotal'       => floatval($r['subtotal']),
                    'tax'            => floatval($r['impuesto']),
                    'tip'            => floatval($r['propina']),
                    'discount'       => floatval($r['descuento']),
                    'waiter_id'      => (string)($r['idmesero']),
                    'waiter_name'    => trim((string)($r['nombre_mesero'])),
                    'table_id'       => '',
                    'table_number'   => (string)($r['mesa']),
                    'covers'         => intval($r['nopersonas']),
                    'status'         => $isPaid ? 'closed' : 'open',
                    'payment_type'   => $pType,
                    'cash_amount'    => $ef,
                    'card_amount'    => $ta,
                    'voucher_amount' => $va,
                    'other_amount'   => $ot,
                    'opened_at'      => $dtStr,
                    'closed_at'      => $isPaid ? $dtStr : null,
                    'items'          => []
                ];
            }

            $result = $this->sendToAPI('sales', $data);
            echo "[EXITO] " . count($data) . " tickets enviados. Response: " . json_encode($result) . "\n";

        } catch (Throwable $e) {
            echo "[ERROR] " . $e->getMessage() . "\n";
        }
    }

    private function sendToAPI(string $module, array $data): array {
        $payload = json_encode(['module' => $module, 'data' => $data, 'sync_datetime' => date('Y-m-d H:i:s')]);
        $ch = curl_init(API_URL);
        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => $payload,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER     => ['Content-Type: application/json', 'X-API-Key: ' . API_KEY],
            CURLOPT_TIMEOUT        => 30,
            CURLOPT_SSL_VERIFYPEER => false
        ]);
        $res  = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        return ['http' => $code, 'body' => json_decode($res, true)];
    }

    public function run(): void {
        while (true) {
            if ($this->connect()) {
                $this->syncToday();
                $this->conn = null;
            }
            echo "Esperando 10s...\n";
            sleep(10);
        }
    }
}

$sync = new SyncFinal();
$sync->run();
