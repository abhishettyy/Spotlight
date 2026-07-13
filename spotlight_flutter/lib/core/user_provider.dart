import 'package:flutter/foundation.dart';

class UserModel {
  final String id;
  final String name;
  final String email;
  final String? usn;
  final String? branch;
  final String? phone;
  final String? year;
  final String? sem;
  final String? clubId;

  UserModel({
    required this.id,
    required this.name,
    required this.email,
    this.usn,
    this.branch,
    this.phone,
    this.year,
    this.sem,
    this.clubId,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] ?? '',
      name: json['fullName'] ?? json['full_name'] ?? json['name'] ?? '',
      email: json['email'] ?? '',
      usn: json['usn'],
      branch: json['branch'],
      phone: json['phone'],
      year: json['year']?.toString(),
      sem: json['sem']?.toString(),
      clubId: json['clubId'] ?? json['club_id'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'email': email,
      'usn': usn,
      'branch': branch,
      'phone': phone,
      'year': year,
      'sem': sem,
      'clubId': clubId,
    };
  }

  bool get isProfileIncomplete {
    if (clubId != null && clubId!.isNotEmpty) {
      return false; 
    }
    return usn == null || usn!.isEmpty ||
        branch == null || branch!.isEmpty ||
        phone == null || phone!.isEmpty;
  }
}

class UserProvider with ChangeNotifier {
  UserModel? _currentUser;

  UserModel? get currentUser => _currentUser;

  void setCurrentUser(UserModel? user) {
    _currentUser = user;
    notifyListeners();
  }
}
