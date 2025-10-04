# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-10-04

### Added
- Initial release of TeX to PNG Converter
- Web interface for LaTeX formula to PNG conversion
- RESTful API endpoint `/api/render`
- Support for inline (`$...$`) and block (`$$...$$`) formulas
- Configurable rendering options:
  - Font family selection (with presets)
  - Font size (px)
  - Text color (with color presets)
  - Background color (with transparency support)
  - Padding (px, including 0px support)
  - Scale factor for high-DPI output
- Real-time preview in web interface
- High-quality PNG output with transparent background support
- KaTeX-based formula rendering
- Puppeteer-based image generation

### Technical Features
- Express.js server with CORS support
- Automatic formula parsing and text segmentation
- UUID-based unique image naming
- Static file serving for generated images
- Error handling and validation
- No-cache headers for development

### Documentation
- Comprehensive README with usage examples
- Technical documentation (TECHNICAL.md)
- API documentation with multiple language examples
- MIT License

## [Unreleased]

### Planned Features
- Formula caching mechanism
- Browser instance pooling for better performance
- Automatic image cleanup
- Docker deployment support
- Unit and integration tests
- Performance monitoring and metrics