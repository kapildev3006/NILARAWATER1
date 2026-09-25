import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';
import '../services/user_service.dart';
import '../utils/env_config.dart';

class EditProfileScreen extends StatefulWidget {
  const EditProfileScreen({super.key});

  @override
  State<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends State<EditProfileScreen> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _nameController;
  late TextEditingController _phoneController;
  late TextEditingController _emailController;
  String _photoUrl = "";
  bool _isUploading = false;

  @override
  void initState() {
    super.initState();
    final profile = UserService().profile.value;
    _nameController = TextEditingController(text: profile.name);
    _phoneController = TextEditingController(text: profile.phone);
    _emailController = TextEditingController(text: profile.email);
    final rawPhoto = profile.photoUrl;
    _photoUrl = rawPhoto.contains('pravatar.cc') ? '' : rawPhoto;
  }

  Widget _buildAvatarPlaceholder() {
    final name = _nameController.text.trim();
    final initial = name.isNotEmpty ? name[0].toUpperCase() : '';
    return Container(
      width: 100,
      height: 100,
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [Color(0xFF168BDB), Color(0xFF0258C9)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: Center(
        child: initial.isNotEmpty
            ? Text(
                initial,
                style: GoogleFonts.outfit(
                  fontSize: 44,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              )
            : const Icon(
                Icons.person_rounded,
                size: 54,
                color: Colors.white,
              ),
      ),
    );
  }

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _emailController.dispose();
    super.dispose();
  }

  Future<void> _pickAndUploadImage() async {
    try {
      final ImagePicker picker = ImagePicker();
      final XFile? image = await picker.pickImage(source: ImageSource.gallery);
      
      if (image != null) {
        setState(() {
          _isUploading = true;
        });

        final user = FirebaseAuth.instance.currentUser;
        if (user == null) throw Exception('Not logged in');
        final token = await user.getIdToken();
        final bytes = await image.readAsBytes();

        // Local fallback: Uri.parse('http://localhost:5000/api/v1/users/me/avatar')
        var request = http.MultipartRequest('POST', Uri.parse('${EnvConfig.apiUrl}/users/me/avatar'));
        request.headers.addAll({
          'Authorization': 'Bearer $token',
        });
        
        final mimeType = image.mimeType ?? 'image/jpeg';
        final typeData = mimeType.split('/');
        
        request.files.add(http.MultipartFile.fromBytes(
          'avatar', 
          bytes, 
          filename: image.name.isEmpty ? 'avatar.jpg' : image.name,
          contentType: MediaType(typeData[0], typeData.length > 1 ? typeData[1] : 'jpeg')
        ));

        var streamedResponse = await request.send();
        var response = await http.Response.fromStream(streamedResponse);

        if (response.statusCode == 200) {
          final data = jsonDecode(response.body);
          if (data['success'] == true) {
            final newUrl = data['data']['photoUrl'];
            if (!mounted) return;
            setState(() {
              _photoUrl = newUrl;
            });
            UserService().updateProfile(photoUrl: newUrl);
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Avatar uploaded successfully!'), backgroundColor: Colors.green),
            );
          }
        } else {
          throw Exception('Failed to upload: ${response.body}');
        }
      }
    } catch (e) {
      debugPrint("Upload error: $e");
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString().replaceAll('Exception: ', '')), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isUploading = false;
        });
      }
    }
  }

  void _saveProfile() async {
    if (_formKey.currentState!.validate()) {
      UserService().updateProfile(
        name: _nameController.text.trim(),
        phone: _phoneController.text.trim(),
        email: _emailController.text.trim(),
        photoUrl: _photoUrl,
      );
      
      final user = FirebaseAuth.instance.currentUser;
      if (user != null) {
        try {
          final token = await user.getIdToken();
          // Local fallback: Uri.parse('http://localhost:5000/api/v1/users/me')
          await http.patch(
            Uri.parse('${EnvConfig.apiUrl}/users/me'),
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer $token',
            },
            body: jsonEncode({
              'displayName': _nameController.text.trim(),
              'phone': _phoneController.text.trim(),
            }),
          );
        } catch (e) {
          debugPrint('Failed to sync profile update to backend: $e');
        }
      }

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text("Profile updated successfully!", style: GoogleFonts.outfit()),
          backgroundColor: Colors.green,
        ),
      );
      Navigator.pop(context);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        iconTheme: const IconThemeData(color: Colors.black87),
        title: Text(
          "Edit Profile",
          style: GoogleFonts.outfit(color: Colors.black87, fontWeight: FontWeight.bold),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Stack(
                  children: [
                    Container(
                      width: 100,
                      height: 100,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(color: const Color(0xFF168BDB), width: 3),
                        gradient: _photoUrl.isEmpty
                            ? const LinearGradient(
                                colors: [Color(0xFF168BDB), Color(0xFF0258C9)],
                                begin: Alignment.topLeft,
                                end: Alignment.bottomRight,
                              )
                            : null,
                      ),
                      child: ClipOval(
                        child: _photoUrl.isNotEmpty
                            ? Image.network(
                                _photoUrl,
                                width: 100,
                                height: 100,
                                fit: BoxFit.cover,
                                errorBuilder: (context, error, stackTrace) => _buildAvatarPlaceholder(),
                              )
                            : _buildAvatarPlaceholder(),
                      ),
                    ),
                    if (_isUploading)
                      Container(
                        width: 100,
                        height: 100,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: Colors.black.withValues(alpha: 0.5),
                        ),
                        child: const Center(
                          child: CircularProgressIndicator(color: Colors.white),
                        ),
                      ),
                    Positioned(
                      bottom: 0,
                      right: 0,
                      child: GestureDetector(
                        onTap: _isUploading ? null : _pickAndUploadImage,
                        child: Container(
                          padding: const EdgeInsets.all(8),
                          decoration: const BoxDecoration(
                            color: Color(0xFF168BDB),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(Icons.camera_alt, color: Colors.white, size: 20),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 32),
              _buildTextField("Full Name", _nameController, Icons.person_outline),
              const SizedBox(height: 20),
              _buildTextField("Phone Number", _phoneController, Icons.phone_outlined, isPhone: true),
              const SizedBox(height: 20),
              _buildTextField("Email Address", _emailController, Icons.email_outlined, isEmail: true),
              const SizedBox(height: 40),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _isUploading ? null : _saveProfile,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF168BDB),
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: Text(
                    "Save Changes",
                    style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTextField(String label, TextEditingController controller, IconData icon, {bool isPhone = false, bool isEmail = false}) {
    return TextFormField(
      controller: controller,
      keyboardType: isPhone ? TextInputType.phone : (isEmail ? TextInputType.emailAddress : TextInputType.name),
      maxLength: isPhone ? 10 : null,
      inputFormatters: isPhone ? [FilteringTextInputFormatter.digitsOnly] : null,
      decoration: InputDecoration(
        counterText: isPhone ? "" : null,
        labelText: label,
        labelStyle: GoogleFonts.outfit(color: Colors.grey.shade600),
        prefixIcon: Icon(icon, color: Colors.grey.shade600),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: Colors.grey.shade300),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: Colors.grey.shade300),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFF168BDB)),
        ),
        filled: true,
        fillColor: Colors.grey.shade50,
      ),
      validator: (value) {
        if (value == null || value.trim().isEmpty) return "Please enter your $label";
        if (isPhone && value.trim().length != 10) return "Phone number must be 10 digits";
        return null;
      },
    );
  }
}



