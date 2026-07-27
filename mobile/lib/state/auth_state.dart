import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../api/auth_api.dart' as auth_api;

class AuthState extends ChangeNotifier {
  String? token;
  Map<String, dynamic>? user;
  bool loading = true;

  AuthState() {
    _restoreSession();
  }

  // On app start, if a token was saved from a previous session, fetch the
  // matching user so closing/reopening the app doesn't lose the login.
  Future<void> _restoreSession() async {
    final prefs = await SharedPreferences.getInstance();
    final savedToken = prefs.getString('token');
    if (savedToken == null) {
      loading = false;
      notifyListeners();
      return;
    }

    try {
      final res = await auth_api.getCurrentUser(savedToken);
      token = savedToken;
      user = res['data'];
    } catch (_) {
      await prefs.remove('token');
    }
    loading = false;
    notifyListeners();
  }

  Future<void> loginWithResult(Map<String, dynamic> result) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('token', result['token']);
    token = result['token'];
    user = result['user'];
    notifyListeners();
  }

  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('token');
    token = null;
    user = null;
    notifyListeners();
  }
}
