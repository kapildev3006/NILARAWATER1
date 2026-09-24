import 'audio/alert_audio_platform.dart';
import 'audio/alert_audio_stub.dart'
    if (dart.library.html) 'audio/alert_audio_web.dart'
    if (dart.library.io) 'audio/alert_audio_mobile.dart';

class AlertAudioService {
  static final AlertAudioService _instance = AlertAudioService._internal();
  factory AlertAudioService() => _instance;
  AlertAudioService._internal() : _platform = getAlertAudioPlatform();

  final AlertAudioPlatform _platform;

  void playTone(String toneName, {double volume = 85.0}) {
    _platform.playTone(toneName, volume: volume);
  }

  void stopTone() {
    _platform.stopTone();
  }

  void vibrate({int durationMs = 400}) {
    _platform.vibrate(durationMs: durationMs);
  }

  void playOrderAlert() {
    playTone('order_alert');
    vibrate(durationMs: 800);
  }

  void speak(String text) {
    _platform.speak(text);
  }
}
