<?php
require_once __DIR__.'/../config/database.php';
if($_SERVER['REQUEST_METHOD']!=='POST'){header('Location: ../../contact.php');exit;}
$n=trim($_POST['name']??'');$e=trim($_POST['email']??'');$p=trim($_POST['phone']??'');$s=trim($_POST['subject']??'');$m=trim($_POST['message']??'');
if($n===''||!filter_var($e,FILTER_VALIDATE_EMAIL)||$m===''){header('Location: ../../contact.php?error=1');exit;}
$q=$pdo->prepare('INSERT INTO messages(name,email,phone,subject,message) VALUES(?,?,?,?,?)');$q->execute([$n,$e,$p,$s,$m]);header('Location: ../../contact.php?sent=1');exit;