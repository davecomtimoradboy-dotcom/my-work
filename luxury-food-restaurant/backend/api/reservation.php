<?php
require_once __DIR__.'/../config/database.php';
if($_SERVER['REQUEST_METHOD']!=='POST')exit;
$n=trim($_POST['name']??'');$p=trim($_POST['phone']??'');$e=trim($_POST['email']??'');$g=(int)($_POST['guests']??1);$d=$_POST['date']??'';$t=$_POST['time']??'';$notes=trim($_POST['notes']??'');
if($n===''||$p===''||!filter_var($e,FILTER_VALIDATE_EMAIL)||!$d||!$t)die('Please complete the reservation form.');
$q=$pdo->prepare('INSERT INTO reservations(name,phone,email,guests,reservation_date,reservation_time,notes) VALUES(?,?,?,?,?,?,?)');$q->execute([$n,$p,$e,$g,$d,$t,$notes]);header('Location: ../../reservation.php?sent=1');